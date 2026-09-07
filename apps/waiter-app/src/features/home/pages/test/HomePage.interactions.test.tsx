import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listRequests: vi.fn(),
  resolveRequest: vi.fn(),
  useOrders: vi.fn(),
  realtime: new Map<string, (event: any) => void>(),
}));

vi.mock("@pos/api-client", () => ({
  createCustomersApi: () => ({
    listRequests: mocks.listRequests,
    resolveRequest: mocks.resolveRequest,
  }),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/features/orders/hooks/useOrders", () => ({
  useOrders: mocks.useOrders,
}));
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (name: string, handler: (event: any) => void) => {
    mocks.realtime.set(name, handler);
  },
}));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/features/orders/components/OrderCard", () => ({
  OrderCard: ({ order, onSelect }: any) => (
    <button onClick={() => onSelect(order.id)}>Order {order.id}</button>
  ),
}));

import { HomePage } from "@/features/home/pages/HomePage";

const order = (id: string, status = "OPEN", ready = false) => ({
  id,
  status,
  kitchenTickets: ready ? [{ id: `${id}-ticket`, status: "READY" }] : [],
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("HomePage interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtime.clear();
    mocks.listRequests.mockResolvedValue([]);
    mocks.resolveRequest.mockResolvedValue(undefined);
    mocks.useOrders.mockReturnValue({ data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders active attention groups and handles navigation and request resolution", async () => {
    mocks.useOrders.mockReturnValue({
      data: [
        order("ready", "OPEN", true),
        order("bill", "BILL_REQUESTED"),
        order("hidden-bill", "BILL_REQUESTED"),
        order("closed", "PAID"),
      ],
    });
    mocks.listRequests.mockResolvedValue([
      { id: "water", tableId: "1234567890", orderId: null, type: "WATER", status: "OPEN" },
      { id: "bill-request", tableId: "T2", orderId: "hidden-bill", type: "BILL", status: "OPEN" },
      { id: "food", tableId: "T3", orderId: null, type: "OTHER_REQUEST", status: "OPEN" },
    ]);
    const onNewOrder = vi.fn();
    const onViewOrders = vi.fn();
    const onSelectOrder = vi.fn();

    render(
      <HomePage
        onNewOrder={onNewOrder}
        onViewOrders={onViewOrders}
        onSelectOrder={onSelectOrder}
      />,
    );
    await flush();

    expect(screen.getByText("2", { selector: "strong" })).toBeTruthy();
    expect(screen.getByText("water requested")).toBeTruthy();
    expect(screen.getByText("other request requested")).toBeTruthy();
    expect(screen.queryByText("bill requested")).toBeNull();
    expect(screen.getByText(/Table 7890/)).toBeTruthy();
    expect(screen.getByText("Order ready")).toBeTruthy();
    expect(screen.getByText("Order bill")).toBeTruthy();

    fireEvent.click(screen.getByText("Start new order"));
    fireEvent.click(screen.getByText("View all"));
    fireEvent.click(screen.getByText("Order ready"));
    expect(onNewOrder).toHaveBeenCalledTimes(1);
    expect(onViewOrders).toHaveBeenCalledTimes(1);
    expect(onSelectOrder).toHaveBeenCalledWith("ready");

    fireEvent.click(screen.getAllByText("Done")[0]!);
    await waitFor(() => expect(mocks.resolveRequest).toHaveBeenCalledWith("water"));
    await waitFor(() => expect(screen.queryByText("water requested")).toBeNull());
  });

  it("refreshes on focus/timer and handles realtime create/update including duplicates", async () => {
    vi.useFakeTimers();
    render(
      <HomePage onNewOrder={vi.fn()} onViewOrders={vi.fn()} onSelectOrder={vi.fn()} />,
    );
    await flush();
    expect(mocks.listRequests).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("focus"));
    await flush();
    expect(mocks.listRequests).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });
    expect(mocks.listRequests).toHaveBeenCalledTimes(3);

    const created = mocks.realtime.get("customer.request.created")!;
    const updated = mocks.realtime.get("customer.request.updated")!;
    act(() => {
      created({ payload: { id: "r1", tableId: "T1", orderId: null, type: "BILL", status: "OPEN" } });
      created({ payload: { id: "r1", tableId: "T1", orderId: null, type: "BILL", status: "OPEN" } });
    });
    expect(screen.getAllByText("bill requested")).toHaveLength(1);

    act(() => updated({ payload: { id: "r1", status: "OPEN" } }));
    expect(screen.getByText("bill requested")).toBeTruthy();
    act(() => updated({ payload: { id: "r1", status: "RESOLVED" } }));
    expect(screen.queryByText("bill requested")).toBeNull();

    act(() => {
      created({ payload: { id: "r2", tableId: "T2", orderId: null, type: "WATER", status: "OPEN" } });
      updated({ payload: { id: "r2", status: "CANCELLED" } });
    });
    expect(screen.queryByText("water requested")).toBeNull();
  });

  it("ignores failed and late request refreshes after unmount", async () => {
    let resolveLate!: (value: any[]) => void;
    mocks.listRequests.mockImplementationOnce(
      () => new Promise<any[]>((resolve) => { resolveLate = resolve; }),
    );
    const { unmount } = render(
      <HomePage onNewOrder={vi.fn()} onViewOrders={vi.fn()} onSelectOrder={vi.fn()} />,
    );
    unmount();
    await act(async () => resolveLate([{ id: "late", tableId: "T", orderId: null, type: "WATER", status: "OPEN" }]));

    mocks.listRequests.mockRejectedValueOnce(new Error("offline"));
    const second = render(
      <HomePage onNewOrder={vi.fn()} onViewOrders={vi.fn()} onSelectOrder={vi.fn()} />,
    );
    await flush();
    expect(screen.getByText("All caught up!")).toBeTruthy();
    second.unmount();
  });
});
