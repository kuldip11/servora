import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useInfiniteOrders: vi.fn(), fetchNextPage: vi.fn(), observer: null as any }));
vi.mock("@/features/orders/hooks/useOrders", () => ({ useInfiniteOrders: mocks.useInfiniteOrders }));
vi.mock("@/features/orders/components/OrderCard", () => ({
  OrderCard: ({ order, onSelect }: any) => <button onClick={() => onSelect(order.id)}>Order {order.id}</button>,
}));
vi.mock("@pos/ui", () => ({
  Spinner: () => <span>spinner</span>,
  EmptyState: ({ title, description }: any) => <div>{title}:{description}</div>,
}));
import { OrdersPage } from "@/features/orders/pages/OrdersPage";

class ObserverMock {
  cb: any;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(cb: any) { this.cb = cb; mocks.observer = this; }
}

describe("OrdersPage interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).IntersectionObserver = ObserverMock;
    mocks.useInfiniteOrders.mockReturnValue({
      data: { pages: [{ items: [], pagination: { total: 0 } }] },
      isLoading: false, isFetching: false, hasNextPage: false,
      fetchNextPage: mocks.fetchNextPage, isFetchingNextPage: false,
    });
  });

  it("switches filters and renders their empty-state descriptions", () => {
    render(<OrdersPage onSelectOrder={vi.fn()} />);
    expect(screen.getByText(/Nothing is waiting to be served/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(mocks.useInfiniteOrders).toHaveBeenLastCalledWith({ view: "ACTIVE", limit: 20 });
    expect(screen.getByText(/No active orders right now/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText(/No orders placed yet/)).toBeTruthy();
  });

  it("renders loading, data, selection and infinite-scroll states", () => {
    mocks.useInfiniteOrders.mockReturnValue({
      data: undefined, isLoading: true, isFetching: false, hasNextPage: false,
      fetchNextPage: mocks.fetchNextPage, isFetchingNextPage: false,
    });
    const { rerender } = render(<OrdersPage onSelectOrder={vi.fn()} />);
    expect(screen.getByText("spinner")).toBeTruthy();

    const onSelectOrder = vi.fn();
    mocks.useInfiniteOrders.mockReturnValue({
      data: { pages: [{ items: [{ id: "o1" }, { id: "o2" }], pagination: { total: 22 } }] },
      isLoading: false, isFetching: false, hasNextPage: true,
      fetchNextPage: mocks.fetchNextPage, isFetchingNextPage: false,
    });
    rerender(<OrdersPage onSelectOrder={onSelectOrder} />);
    expect(screen.getByRole("button", { name: "Ready 22" })).toBeTruthy();
    fireEvent.click(screen.getByText("Order o1"));
    expect(onSelectOrder).toHaveBeenCalledWith("o1");
    expect(screen.getByText("Scroll for more orders")).toBeTruthy();
    act(() => mocks.observer.cb([{ isIntersecting: true }]));
    expect(mocks.fetchNextPage).toHaveBeenCalled();

    mocks.useInfiniteOrders.mockReturnValue({
      data: { pages: [{ items: [{ id: "o1" }], pagination: { total: 1 } }] },
      isLoading: false, isFetching: false, hasNextPage: true,
      fetchNextPage: mocks.fetchNextPage, isFetchingNextPage: true,
    });
    rerender(<OrdersPage onSelectOrder={onSelectOrder} />);
    expect(screen.getByText("spinner")).toBeTruthy();
  });
});
