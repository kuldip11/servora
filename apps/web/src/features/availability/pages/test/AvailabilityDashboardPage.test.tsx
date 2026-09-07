import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityDashboardPage } from "@/features/availability/pages/AvailabilityDashboardPage";

const { api, realtime } = vi.hoisted(() => ({
  api: { get: vi.fn() },
  realtime: { handler: undefined as (() => void) | undefined },
}));
vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: api.get },
  extractApiError: (error: unknown) =>
    error instanceof Error ? error.message : "Request failed",
}));
vi.mock("../../../../shared/lib/realtime", () => ({
  useRealtimeEvent: vi.fn((_type: string, handler: () => void) => {
    realtime.handler = handler;
  }),
}));

describe("AvailabilityDashboardPage", () => {
  it("loads cross-context resolver output and refreshes on availability realtime events", async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          data: {
            rows: [
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
            ],
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: { rows: [] } } });

    render(<AvailabilityDashboardPage />);

    expect(await screen.findByText("Dal")).toBeTruthy();
    expect(screen.getByText("CUSTOMER QR · DELIVERY")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      "/menu/availability/dashboard",
      expect.objectContaining({
        params: expect.objectContaining({
          channel: "UNSCOPED",
          fulfillmentType: "UNSCOPED",
        }),
      }),
    );

    await act(async () => {
      realtime.handler?.();
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(
        "Everything in the selected scope is currently available.",
      ),
    ).toBeTruthy();
  });
  it("shows API errors and supports filtering, sorting and scoped reloads", async () => {
    api.get.mockRejectedValueOnce(new Error("dashboard down"));
    const failed = render(<AvailabilityDashboardPage />);
    expect(
      await screen.findByText("Availability dashboard unavailable"),
    ).toBeTruthy();
    expect(screen.getByText("dashboard down")).toBeTruthy();
    failed.unmount();

    api.get.mockResolvedValue({
      data: {
        data: {
          rows: [
            {
              entityType: "ITEM",
              entityId: "2",
              menuItemId: "2",
              name: "Zulu",
              status: "OUT_OF_STOCK",
              reason: "No stock",
              cause: "RECIPE_DRIVEN",
              branchId: "b1",
              branchName: null,
              channel: "STAFF",
              fulfillmentType: "DINE_IN",
            },
            {
              entityType: "MODIFIER_OPTION",
              entityId: "1",
              menuItemId: "1",
              name: "Alpha",
              status: "HIDDEN",
              reason: "Disabled",
              cause: "MANUAL",
              branchId: "b1",
              branchName: "Main",
              channel: "CUSTOMER_QR",
              fulfillmentType: "TAKEAWAY",
            },
            {
              entityType: "MODIFIER_OPTION",
              entityId: "1",
              menuItemId: "1",
              name: "Alpha",
              status: "HIDDEN",
              reason: "Disabled",
              cause: "MANUAL",
              branchId: "b1",
              branchName: "Main",
              channel: "CUSTOMER_QR",
              fulfillmentType: "TAKEAWAY",
            },
          ],
        },
      },
    });
    render(<AvailabilityDashboardPage />);
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(screen.getByText(/Current branch/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search availability exceptions"), {
      target: { value: "main" },
    });
    expect(screen.queryByText("Zulu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "STAFF" } });
    fireEvent.change(selects[1]!, { target: { value: "DELIVERY" } });
    fireEvent.change(selects[2]!, { target: { value: "RECIPE_DRIVEN" } });
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        "/menu/availability/dashboard",
        expect.objectContaining({
          params: expect.objectContaining({
            channel: "STAFF",
            fulfillmentType: "DELIVERY",
            cause: "RECIPE_DRIVEN",
          }),
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });
});
