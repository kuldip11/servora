import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryConfigs, realtimeHandlers, qc, api } = vi.hoisted(() => ({
  queryConfigs: [] as any[],
  realtimeHandlers: new Map<string, Function[]>(),
  qc: { setQueryData: vi.fn() },
  api: { fetchOrder: vi.fn() },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useQuery: (config: any) => {
    queryConfigs.push(config);
    return { data: { items: ["x"] } };
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
import { useOrder } from "../useOrder";
const handlers = (name: string) => realtimeHandlers.get(name) ?? [];

beforeEach(() => {
  queryConfigs.length = 0;
  realtimeHandlers.clear();
  vi.clearAllMocks();
});

describe("useOrder", () => {
  const order = { id: "o1", version: 1, kitchenTickets: [] } as any;
  const ticket = {
    id: "k1",
    orderId: "o1",
    status: "READY",
    order: { table: { name: "7" } },
  } as any;

  it("configures the query and handles order/ticket realtime branches", async () => {
    useOrder("o1");
    const query = queryConfigs.at(-1)!;
    expect(query.enabled).toBe(true);
    await query.queryFn();
    for (const name of ["order.updated", "order.created"])
      handlers(name)[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    const updaters = qc.setQueryData.mock.calls
      .map((call) => call[1])
      .filter((value) => typeof value === "function");
    expect(updaters[0](undefined)).toEqual(order);
    expect(updaters[0]({ version: 99 })).toEqual({ version: 99 });
    expect(updaters.at(-1)(order).kitchenTickets).toHaveLength(1);
    expect(updaters.at(-1)(undefined)).toBeUndefined();
  });

  it("disables fetching for a missing order id and ignores unrelated ticket events", () => {
    useOrder(null);
    expect(queryConfigs.at(-1)!.enabled).toBe(false);
    handlers("order.updated")[0]!({ payload: order });
    handlers("order.created")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    handlers("kitchen.ticket.updated")[0]!({
      payload: { ...ticket, orderId: "other" },
    });
  });
});
