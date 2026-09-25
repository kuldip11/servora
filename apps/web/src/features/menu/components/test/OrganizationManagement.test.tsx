import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";

const h = vi.hoisted(() => ({
  has: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  createMenu: vi.fn(),
  updateMenu: vi.fn(),
  removeMenu: vi.fn(),
  createPriceRule: vi.fn(),
  removePriceRule: vi.fn(),
  createLoyaltyTier: vi.fn(),
  removeLoyaltyTier: vi.fn(),
}));
let data: any = {};
const query = (queryKey: readonly unknown[]) => ({
  data: data[JSON.stringify(queryKey)],
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
});
const mutation = (fn: ReturnType<typeof vi.fn>) => ({
  isPending: false,
  mutate: (arg?: unknown, callbacks?: { onSuccess?: () => void }) =>
    Promise.resolve()
      .then(() => fn(arg))
      .then(() => callbacks?.onSuccess?.())
      .catch((error) => h.error(error, mutationErrorFallback(fn))),
});
const mutationErrorFallback = (fn: ReturnType<typeof vi.fn>) => {
  if (fn === h.createMenu) return "Failed to create organization menu";
  if (fn === h.updateMenu) return "Failed to update organization menu";
  if (fn === h.removeMenu) return "Failed to delete organization menu";
  if (fn === h.createPriceRule)
    return "Failed to create organization price rule";
  if (fn === h.removePriceRule)
    return "Failed to remove organization price rule";
  if (fn === h.createLoyaltyTier)
    return "Failed to create organization loyalty tier";
  return "Failed to remove organization loyalty tier";
};
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  Input: ({ label, ...p }: any) => (
    <label>
      {label}
      <input aria-label={label} {...p} />
    </label>
  ),
}));
vi.mock("@/shared/auth/permissions", () => ({
  usePermissions: () => ({ has: h.has }),
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: h.success,
  notifyError: h.error,
}));
vi.mock("@/features/menu/hooks/useOrganizationManagement", () => ({
  useManagedOrganizations: () => query(["menu", "organizations"]),
  useOrganizationTenants: (organizationId: string) =>
    query(["menu", "organizations", organizationId, "tenants"]),
  useOrganizationMenus: (organizationId: string) =>
    query(["menu", "organizations", organizationId, "menus"]),
  useOrganizationPriceRules: (organizationId: string) =>
    query(["menu", "organizations", organizationId, "price-rules"]),
  useOrganizationLoyaltyTiers: (organizationId: string) =>
    query(["menu", "organizations", organizationId, "loyalty-tiers"]),
  useCreateOrganizationMenu: () => mutation(h.createMenu),
  useUpdateOrganizationMenu: () => mutation(h.updateMenu),
  useDeleteOrganizationMenu: () => mutation(h.removeMenu),
  useCreateOrganizationPriceRule: () => mutation(h.createPriceRule),
  useDeleteOrganizationPriceRule: () => mutation(h.removePriceRule),
  useCreateOrganizationLoyaltyTier: () => mutation(h.createLoyaltyTier),
  useDeleteOrganizationLoyaltyTier: () => mutation(h.removeLoyaltyTier),
}));

import { OrganizationManagementSection } from "../OrganizationManagementSection";

const seed = () => {
  const organizations = [
    { id: "o1", name: "Org One" },
    { id: "o2", name: "Org Two" },
  ];
  data = {
    '["menu","organizations"]': organizations,
    '["menu","organizations","o1","tenants"]': [{ id: "t1", name: "Tenant" }],
    '["menu","organizations","o1","menus"]': [
      {
        id: "m1",
        name: "Pub",
        status: "PUBLISHED",
        isDefault: true,
        organizationItems: [{ id: "x", itemSku: "SKU1", categoryName: null }],
      },
      {
        id: "m2",
        name: "Draft",
        status: "DRAFT",
        isDefault: false,
        organizationItems: [],
      },
    ],
    '["menu","organizations","o1","price-rules"]': [
      { id: "r1", menuItemSku: "SKU1", price: 12, isPerCover: false },
      { id: "r2", menuItemSku: null, price: 1, isPerCover: true },
    ],
    '["menu","organizations","o1","loyalty-tiers"]': [
      { id: "l1", name: "Gold", discountPercent: 10, discountFixed: null },
      { id: "l2", name: "Fixed", discountPercent: null, discountFixed: 20 },
    ],
    '["menu","organizations","o2","tenants"]': [],
    '["menu","organizations","o2","menus"]': [],
    '["menu","organizations","o2","price-rules"]': [],
    '["menu","organizations","o2","loyalty-tiers"]': [],
  };
};
describe("OrganizationManagementSection coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.has.mockReturnValue(true);
    seed();
    h.createMenu.mockResolvedValue({});
    h.updateMenu.mockResolvedValue({});
    h.removeMenu.mockResolvedValue({});
    h.createPriceRule.mockResolvedValue({});
    h.removePriceRule.mockResolvedValue({});
    h.createLoyaltyTier.mockResolvedValue({});
    h.removeLoyaltyTier.mockResolvedValue({});
  });
  it("covers permission and missing membership guards", () => {
    h.has.mockReturnValue(false);
    const a = render(<OrganizationManagementSection />);
    expect(screen.getByText(/need the organization:manage/)).toBeTruthy();
    a.unmount();
    h.has.mockReturnValue(true);
    data['["menu","organizations"]'] = [];
    render(<OrganizationManagementSection />);
    expect(screen.getByText(/not linked/)).toBeTruthy();
  });
  it("covers populated organization CRUD and selectors", async () => {
    render(<OrganizationManagementSection />);
    expect(screen.getByText(/Org One · 1 member/)).toBeTruthy();
    expect(screen.getAllByText(/SKU1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/No SKUs/)).toBeTruthy();
    expect(screen.getByText("10% off", { exact: false })).toBeTruthy();
    expect(screen.getByText("₹20.00 off", { exact: false })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Menu name"), {
      target: { value: " New Menu " },
    });
    fireEvent.change(
      screen.getByPlaceholderText("PIZZA-MARGHERITA, DRINK-COLA"),
      { target: { value: " A, B\n C " } },
    );
    fireEvent.click(screen.getByLabelText("Default"));
    fireEvent.click(screen.getByLabelText("Publish now"));
    fireEvent.click(
      screen.getByRole("button", { name: "Create organization menu" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    fireEvent.change(screen.getByLabelText("Menu item SKU"), {
      target: { value: " S1 " },
    });
    fireEvent.change(screen.getByLabelText("Price"), {
      target: { value: "99" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create organization price" }),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    fireEvent.change(screen.getByLabelText("Tier name"), {
      target: { value: " Tier " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create tier" }));
    chooseSelectOption("Discount type", "Fixed amount");
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create tier" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]!);
    await waitFor(() => expect(h.createMenu).toHaveBeenCalled());
    expect(h.createMenu.mock.calls[0][0]).toMatchObject({
      name: "New Menu",
      status: "PUBLISHED",
      isDefault: false,
      items: [
        { itemSku: "A", sortOrder: 0 },
        { itemSku: "B", sortOrder: 1 },
        { itemSku: "C", sortOrder: 2 },
      ],
    });
    expect(h.updateMenu).toHaveBeenCalledTimes(2);
    expect(h.createPriceRule).toHaveBeenCalled();
    await waitFor(() => expect(h.createLoyaltyTier).toHaveBeenCalledTimes(2));
    chooseSelectOption("Organization", "Org Two");
    expect(screen.getByText(/Org Two · 0 member/)).toBeTruthy();
  });
  it("covers mutation errors", async () => {
    h.createMenu.mockRejectedValueOnce(new Error("m"));
    h.createPriceRule.mockRejectedValueOnce(new Error("r"));
    h.createLoyaltyTier.mockRejectedValueOnce(new Error("l"));
    h.removeLoyaltyTier.mockRejectedValueOnce(new Error("d"));
    render(<OrganizationManagementSection />);
    fireEvent.change(screen.getByLabelText("Menu name"), {
      target: { value: "X" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("PIZZA-MARGHERITA, DRINK-COLA"),
      { target: { value: "S" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create organization menu" }),
    );
    fireEvent.change(screen.getByLabelText("Menu item SKU"), {
      target: { value: "S" },
    });
    fireEvent.change(screen.getByLabelText("Price"), {
      target: { value: "1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create organization price" }),
    );
    fireEvent.change(screen.getByLabelText("Tier name"), {
      target: { value: "T" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create tier" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]!);
    await waitFor(() => expect(h.error).toHaveBeenCalledTimes(4));
  });
});
