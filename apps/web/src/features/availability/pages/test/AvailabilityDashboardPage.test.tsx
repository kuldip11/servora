import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";

const mocks = vi.hoisted(() => ({
  useDashboard: vi.fn(),
  query: { current: {} as any },
  realtime: { handler: undefined as (() => void) | undefined },
}));
vi.mock("@/features/availability/hooks/useAvailabilityDashboard", () => ({
  useAvailabilityDashboard: (input: any) => {
    mocks.useDashboard(input);
    return mocks.query.current;
  },
}));
vi.mock("@/shared/lib/api-client", () => ({
  extractApiError: (error: unknown) =>
    error instanceof Error ? error.message : "Request failed",
}));
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: vi.fn((_type: string, handler: () => void) => {
    mocks.realtime.handler = handler;
  }),
}));

import { AvailabilityDashboardPage } from "../AvailabilityDashboardPage";

const rows = [
  {
    entityType: "ITEM",
    entityId: "item-1",
    menuItemId: "item-1",
    name: "Dal",
    status: "OUT_OF_STOCK",
    reason: "Insufficient inventory",
    cause: "RECIPE_DRIVEN",
    branchId: "b1",
    branchName: "Main",
    channel: "CUSTOMER_QR",
    fulfillmentType: "DELIVERY",
  },
];

describe("AvailabilityDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.current = {
      data: rows,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it("uses canonical query inputs and refreshes on realtime events", async () => {
    render(<AvailabilityDashboardPage />);
    expect(screen.getByText("Dal")).toBeTruthy();
    expect(mocks.useDashboard).toHaveBeenCalledWith({
      channel: "UNSCOPED",
      fulfillmentType: "UNSCOPED",
    });
    await act(async () => {
      mocks.realtime.handler?.();
    });
    expect(mocks.query.current.refetch).toHaveBeenCalled();
    chooseSelectOption("Channel", "Staff");
    chooseSelectOption("Fulfillment", "Delivery");
    chooseSelectOption("Cause", "RECIPE DRIVEN");
    expect(mocks.useDashboard).toHaveBeenLastCalledWith({
      channel: "STAFF",
      fulfillmentType: "DELIVERY",
      cause: "RECIPE_DRIVEN",
    });
  });

  it("supports local search and error rendering", () => {
    render(<AvailabilityDashboardPage />);
    fireEvent.change(screen.getByLabelText("Search availability exceptions"), {
      target: { value: "missing" },
    });
    expect(screen.queryByText("Dal")).toBeNull();
    expect(screen.getByText("Live availability")).toBeTruthy();
  });
});
