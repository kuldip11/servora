import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryConfigs, infiniteConfigs, realtimeHandlers, qc, api } = vi.hoisted(
  () => ({
    queryConfigs: [] as any[],
    infiniteConfigs: [] as any[],
    realtimeHandlers: new Map<string, Function[]>(),
    qc: { setQueryData: vi.fn(), invalidateQueries: vi.fn() },
    api: { fetchOrders: vi.fn() },
  }),
);
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useQuery: (config: any) => {
    queryConfigs.push(config);
    return { data: { items: ["x"] } };
  },
  useInfiniteQuery: (config: any) => {
    infiniteConfigs.push(config);
    return { marker: "infinite" };
  },
}));
vi.mock("@/features/orders/api/orders", () => api);
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (name: string, callback: Function) => {
    const list = realtimeHandlers.get(name) ?? [];
    list.push(callback);
    realtimeHandlers.set(name, list);
  },
}));
vi.mock("@/features/orders/utils/realtime", () => ({
  shouldApplyRealtime: vi.fn(
    (current: any) => !current || current.version !== 99,
  ),
  mergeRealtimeTicket: vi.fn((current: any[], ticket: any) => [
    ...current,
    ticket,
  ]),
}));
import { useInfiniteOrders, useOrders, useOrdersPage } from "../useOrders";
const handlers = (name: string) => realtimeHandlers.get(name) ?? [];

beforeEach(() => {
  queryConfigs.length = 0;
  infiniteConfigs.length = 0;
  realtimeHandlers.clear();
  vi.clearAllMocks();
});

describe("useOrders", () => {
  const order = { id: "o1", version: 1, kitchenTickets: [] } as any;
  const ticket = { id: "k1", orderId: "o1", status: "READY" } as any;
  const filters = { page: 1, limit: 10 } as any;

  it("covers list and page query callbacks with realtime ticket updates", async () => {
    const result = useOrders(filters);
    expect(result.data).toEqual(["x"]);
    await queryConfigs.at(-1)!.queryFn();
    handlers("order.created")[0]!({ payload: order });
    handlers("order.updated")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    let updater = qc.setQueryData.mock.calls.at(-1)![1];
    expect(updater(undefined)).toBeUndefined();
    expect(updater(order).kitchenTickets).toHaveLength(1);

    realtimeHandlers.clear();
    queryConfigs.length = 0;
    qc.setQueryData.mockClear();
    useOrdersPage(filters);
    await queryConfigs.at(-1)!.queryFn();
    handlers("order.created")[0]!({ payload: order });
    handlers("order.updated")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    updater = qc.setQueryData.mock.calls.at(-1)![1];
    expect(updater(undefined)).toBeUndefined();
    expect(updater(order).kitchenTickets).toHaveLength(1);
  });

  it("covers infinite pagination and realtime updates", async () => {
    useInfiniteOrders({ limit: undefined } as any);
    const query = infiniteConfigs.at(-1)!;
    await query.queryFn({ pageParam: 2 });
    expect(api.fetchOrders).toHaveBeenLastCalledWith({ limit: 20, page: 2 });
    expect(
      query.getNextPageParam({ pagination: { hasMore: true, page: 2 } }),
    ).toBe(3);
    expect(
      query.getNextPageParam({ pagination: { hasMore: false, page: 2 } }),
    ).toBeUndefined();
    handlers("order.created")[0]!({ payload: order });
    handlers("order.updated")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    const updater = qc.setQueryData.mock.calls.at(-1)![1];
    expect(updater(undefined)).toBeUndefined();
    expect(updater(order).kitchenTickets).toHaveLength(1);
  });
});
