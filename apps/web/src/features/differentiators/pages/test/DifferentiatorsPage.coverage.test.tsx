import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dashboard: vi.fn(),
  menuEngineering: vi.fn(),
  listCategories: vi.fn(),
  previewCombo: vi.fn(),
  createCombo: vi.fn(),
  previewPromotion: vi.fn(),
  createPromotion: vi.fn(),
  explain: vi.fn(),
  setThreshold: vi.fn(),
  toast: vi.fn(),
  extract: vi.fn(),
  realtime: null as null | (() => void),
}));

vi.mock("@pos/api-client", () => ({
  createAnalyticsApi: () => ({ menuEngineering: mocks.menuEngineering }),
  createApprovalsApi: () => ({ setThreshold: mocks.setThreshold }),
  createAvailabilityApi: () => ({ dashboard: mocks.dashboard }),
  createMenuApi: () => ({
    listCategories: mocks.listCategories,
    previewCombo: mocks.previewCombo,
    createCombo: mocks.createCombo,
    previewPromotion: mocks.previewPromotion,
    createPromotion: mocks.createPromotion,
  }),
  createOrdersApi: () => ({ explain: mocks.explain }),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {}, extractApiError: mocks.extract }));
vi.mock("@/shared/lib/realtime", () => ({ useRealtimeEvent: (_event: string, callback: () => void) => { mocks.realtime = callback; } }));
vi.mock("@pos/ui", () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => <header><h1>{title}</h1><p>{description}</p></header>,
  toast: mocks.toast,
}));

import { DifferentiatorsPage } from "../DifferentiatorsPage";

const availabilityRow = {
  entityType: "MENU_ITEM",
  entityId: "i1",
  menuItemId: "i1",
  name: "Paneer Tikka",
  status: "UNAVAILABLE",
  reason: "Out of stock",
  cause: "RECIPE_DRIVEN",
  branchId: "b1",
  branchName: "Central",
  channel: "STAFF",
  fulfillmentType: "DINE_IN",
};

const categories = [{
  id: "c1",
  name: "Mains",
  menuItems: [
    { id: "i1", name: "Paneer Tikka", isPublished: true, status: "ACTIVE" },
    { id: "i2", name: "Hidden", isPublished: false, status: "ACTIVE" },
    { id: "i3", name: "Old", isPublished: true, status: "DISCONTINUED" },
  ],
}];

const engineering = [
  { menuItemId: "i1", menuItemName: "Paneer", variantName: null, margin: 80, salesVolume: 10, quadrant: "STAR", recommendation: "Keep" },
  { menuItemId: "i2", menuItemName: "Burger", variantName: "Large", margin: 30, salesVolume: 30, quadrant: "DOG", recommendation: "Review" },
];

describe("DifferentiatorsPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtime = null;
    mocks.extract.mockReturnValue("Request failed");
    mocks.dashboard.mockResolvedValue({ rows: [availabilityRow] });
    mocks.menuEngineering.mockResolvedValue(engineering);
    mocks.listCategories.mockResolvedValue(categories);
    mocks.previewCombo.mockResolvedValue({ resolvedTotal: 250 });
    mocks.createCombo.mockResolvedValue({});
    mocks.previewPromotion.mockResolvedValue({ subtotal: 100, discountAmount: 10, totalAmount: 90 });
    mocks.createPromotion.mockResolvedValue({});
    mocks.explain.mockResolvedValue({ source: "pricing", total: 100 });
    mocks.setThreshold.mockResolvedValue({});
  });

  it("loads and filters live availability and menu engineering, including realtime refresh", async () => {
    render(<DifferentiatorsPage />);
    expect(await screen.findByText("Paneer Tikka")).toBeTruthy();
    expect(screen.getByText("Central · MENU ITEM · STAFF · DINE_IN")).toBeTruthy();
    expect(mocks.dashboard).toHaveBeenCalledWith({ channel: "UNSCOPED", fulfillmentType: "UNSCOPED" });

    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "STAFF" } });
    fireEvent.change(screen.getByLabelText("Fulfillment"), { target: { value: "TAKEAWAY" } });
    fireEvent.change(screen.getByLabelText("Cause"), { target: { value: "RECIPE_DRIVEN" } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(mocks.dashboard).toHaveBeenLastCalledWith({ channel: "STAFF", fulfillmentType: "TAKEAWAY", cause: "RECIPE_DRIVEN" }));
    mocks.realtime?.();
    await waitFor(() => expect(mocks.dashboard.mock.calls.length).toBeGreaterThan(2));

    fireEvent.click(screen.getByRole("button", { name: "Menu engineering" }));
    expect(await screen.findByText("Paneer")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Analysis window"), { target: { value: "30" } });
    await waitFor(() => expect(mocks.menuEngineering).toHaveBeenCalledWith(30));
    fireEvent.change(screen.getByLabelText("Quadrant"), { target: { value: "DOG" } });
    expect(screen.getByText(/Burger/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "margin" } });
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "name" } });
  });

  it("explains orders and creates combo and promotion drafts with authoritative previews", async () => {
    render(<DifferentiatorsPage />);
    await screen.findByText("Paneer Tikka");

    fireEvent.click(screen.getByRole("button", { name: "Order explain" }));
    fireEvent.change(screen.getByPlaceholderText("Order UUID"), { target: { value: "order-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Explain" }));
    await waitFor(() => expect(mocks.explain).toHaveBeenCalledWith("order-1"));
    expect(screen.getByText(/pricing/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guided builder" }));
    fireEvent.change(screen.getByPlaceholderText("Lunch combo"), { target: { value: "Lunch Combo" } });
    const itemSelects = screen.getAllByLabelText("Menu item");
    fireEvent.change(itemSelects[0]!, { target: { value: "i1" } });
    fireEvent.change(itemSelects[1]!, { target: { value: "i1" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview authoritative price" }));
    await waitFor(() => expect(mocks.previewCombo).toHaveBeenCalled());
    expect(screen.getByText("Resolved total: ₹250.00")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Create combo" })[1]!);
    await waitFor(() => expect(mocks.createCombo).toHaveBeenCalledWith(expect.objectContaining({ name: "Lunch Combo", pricePolicy: "FIXED" })));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Create promotion" })[0]!);
    fireEvent.change(screen.getByPlaceholderText("Weekday special"), { target: { value: "Weekday" } });
    fireEvent.change(screen.getByLabelText("Preview against menu item"), { target: { value: "i1" } });
    fireEvent.change(screen.getByPlaceholderText("LUNCH10"), { target: { value: "lunch10" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview authoritative discount" }));
    await waitFor(() => expect(mocks.previewPromotion).toHaveBeenCalledWith(expect.objectContaining({ items: [{ menuItemId: "i1", quantity: 1 }] })));
    expect(screen.getByText(/Sample: ₹100.00/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Create promotion" })[1]!);
    await waitFor(() => expect(mocks.createPromotion).toHaveBeenCalledWith(expect.objectContaining({ name: "Weekday", couponCode: "LUNCH10" })));
  });

  it("saves approval rules and reports API failures", async () => {
    render(<DifferentiatorsPage />);
    await screen.findByText("Paneer Tikka");
    fireEvent.click(screen.getByRole("button", { name: "Approval rules" }));
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "VOID" } });
    fireEvent.change(screen.getByLabelText("Threshold amount"), { target: { value: "750" } });
    fireEvent.change(screen.getByLabelText("Required role"), { target: { value: "Owner" } });
    fireEvent.click(screen.getByRole("button", { name: "Save threshold" }));
    await waitFor(() => expect(mocks.setThreshold).toHaveBeenCalledWith("VOID", { thresholdAmount: 750, requiresRole: "Owner" }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Void threshold saved", tone: "success" }));

    mocks.dashboard.mockRejectedValueOnce(new Error("boom"));
    fireEvent.click(screen.getByRole("button", { name: "Live availability" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: "Request failed", tone: "danger" }));
  });
});
