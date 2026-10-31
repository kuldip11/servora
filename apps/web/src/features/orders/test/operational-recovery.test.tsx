import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  tables: vi.fn(),
}));
vi.mock("../services/orders.service", () => ({
  ordersService: { list: mocks.list, detail: mocks.detail },
}));
vi.mock("@/features/tables/services/tables.service", () => ({
  tablesService: { list: mocks.tables },
}));
import { ordersListQuery, orderDetailQuery } from "../query-options";
import { tablesQuery } from "@/features/tables/query-options";

afterEach(() => {
  vi.useRealTimers();
});
describe("operational recovery without socket delivery", () => {
  it("refreshes mounted order lists, detail and table occupancy without any realtime frame", async () => {
    vi.useFakeTimers();
    mocks.list
      .mockResolvedValueOnce({ items: [{ id: "o1", status: "OPEN" }] })
      .mockResolvedValue({ items: [{ id: "o1", status: "PAID" }] });
    mocks.detail
      .mockResolvedValueOnce({ id: "o1", status: "OPEN" })
      .mockResolvedValue({ id: "o1", status: "PAID" });
    mocks.tables
      .mockResolvedValueOnce([{ id: "t1", status: "OCCUPIED" }])
      .mockResolvedValue([{ id: "t1", status: "AVAILABLE" }]);
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
      },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const h = renderHook(
      () => ({
        orders: useQuery(ordersListQuery({})),
        detail: useQuery(orderDetailQuery("o1")),
        tables: useQuery(tablesQuery()),
      }),
      { wrapper },
    );
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(h.result.current.orders.data?.items[0]?.status).toBe("OPEN");
    // Socket remains logically connected but its event is lost; no invalidation,
    // browser focus, network reconnect or remount is supplied by this test.
    await act(() => vi.advanceTimersByTimeAsync(15_010));
    expect(h.result.current.orders.data?.items[0]?.status).toBe("PAID");
    expect(h.result.current.detail.data?.status).toBe("PAID");
    expect(h.result.current.tables.data?.[0]?.status).toBe("AVAILABLE");
    expect(mocks.list).toHaveBeenCalledTimes(2);
    h.unmount();
    client.clear();
  });
});
