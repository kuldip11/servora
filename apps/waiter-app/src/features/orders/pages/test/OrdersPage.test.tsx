import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../../hooks/useOrders", () => ({
  useInfiniteOrders: vi.fn(() => ({
    data: { pages: [{ items: [], pagination: { total: 0 } }] },
    isLoading: false,
    refetch: vi.fn(),
    isFetching: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  })),
}));
import { OrdersPage } from "@/features/orders/pages/OrdersPage";
describe("OrdersPage", () => {
  it("renders empty active state", () => {
    const html = renderToStaticMarkup(<OrdersPage onSelectOrder={vi.fn()} />);
    expect(html).toContain("Orders");
    expect(html).toContain("No orders");
  });
});
