import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useOrders: vi.fn(),
  useCustomerRequests: vi.fn(),
  resolveMutate: vi.fn(),
  ordersRefetch: vi.fn(),
  requestsRefetch: vi.fn(),
}));

vi.mock("@/features/orders/hooks/useOrders", () => ({
  useOrders: mocks.useOrders,
}));
vi.mock("@/features/home/hooks/useCustomerRequests", () => ({
  useCustomerRequests: mocks.useCustomerRequests,
  useResolveCustomerRequest: () => ({
    mutate: mocks.resolveMutate,
    isPending: false,
    variables: undefined,
  }),
}));
vi.mock("@pos/api-client", () => ({
  extractApiError: (_error: unknown, fallback?: string) => fallback ?? "error",
}));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  QueryErrorState: ({ title, onRetry }: any) => (
    <div>
      <span>{title}</span>
      <button onClick={onRetry}>Retry attention</button>
    </div>
  ),
  StaleDataBanner: ({ message, onRetry }: any) => (
    <div>
      <span>{message}</span>
      <button onClick={onRetry}>Retry stale</button>
    </div>
  ),
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

const ordersQuery = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isError: false,
  error: null,
  isFetching: false,
  refetch: mocks.ordersRefetch,
  ...overrides,
});
const requestsQuery = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isError: false,
  error: null,
  isFetching: false,
  refetch: mocks.requestsRefetch,
  ...overrides,
});

describe("HomePage interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useOrders.mockReturnValue(ordersQuery());
    mocks.useCustomerRequests.mockReturnValue(requestsQuery());
  });

  it("renders attention groups and resolves requests through the mutation hook", () => {
    mocks.useOrders.mockReturnValue(
      ordersQuery({
        data: [order("ready", "OPEN", true), order("bill", "BILL_REQUESTED")],
      }),
    );
    mocks.useCustomerRequests.mockReturnValue(
      requestsQuery({
        data: [
          {
            id: "water",
            tableId: "1234567890",
            orderId: null,
            type: "WATER",
            status: "OPEN",
          },
        ],
      }),
    );
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

    expect(screen.getByText("water requested")).toBeTruthy();
    expect(screen.getByText("Order ready")).toBeTruthy();
    fireEvent.click(screen.getByText("Start new order"));
    fireEvent.click(screen.getByText("View all"));
    fireEvent.click(screen.getByText("Order ready"));
    fireEvent.click(screen.getByText("Done"));
    expect(onNewOrder).toHaveBeenCalledTimes(1);
    expect(onViewOrders).toHaveBeenCalledTimes(1);
    expect(onSelectOrder).toHaveBeenCalledWith("ready");
    expect(mocks.resolveMutate).toHaveBeenCalledWith("water");
  });

  it("retries both dependencies and never renders healthy empty state on initial failure", () => {
    mocks.useOrders.mockReturnValue(
      ordersQuery({
        data: undefined,
        isError: true,
        error: new Error("offline"),
      }),
    );
    render(
      <HomePage
        onNewOrder={vi.fn()}
        onViewOrders={vi.fn()}
        onSelectOrder={vi.fn()}
      />,
    );
    expect(screen.getByText("Unable to load attention items")).toBeTruthy();
    expect(screen.queryByText("All caught up!")).toBeNull();
    fireEvent.click(screen.getByText("Retry attention"));
    expect(mocks.ordersRefetch).toHaveBeenCalledTimes(1);
    expect(mocks.requestsRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps stale attention data visible and labels refresh failure", () => {
    mocks.useOrders.mockReturnValue(
      ordersQuery({ data: [order("ready", "OPEN", true)], isError: true }),
    );
    render(
      <HomePage
        onNewOrder={vi.fn()}
        onViewOrders={vi.fn()}
        onSelectOrder={vi.fn()}
      />,
    );
    expect(screen.getByText("Order ready")).toBeTruthy();
    expect(
      screen.getByText(/Attention data could not be refreshed/),
    ).toBeTruthy();
  });
});
