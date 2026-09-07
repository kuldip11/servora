import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, queryConfigs, infiniteConfigs, realtimeHandlers, qc, toast, api, createOrder, extractApiError } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  queryConfigs: [] as any[],
  infiniteConfigs: [] as any[],
  realtimeHandlers: new Map<string, Function[]>(),
  qc: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  toast: vi.fn(),
  api: { addOrderItems: vi.fn(), compOrderItem: vi.fn(), voidOrderItem: vi.fn(), fetchOrder: vi.fn(), fetchOrders: vi.fn(), transferOrderTable: vi.fn(), updateOrderStatus: vi.fn(), updateTicketStatus: vi.fn() },
  createOrder: vi.fn(),
  extractApiError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
  useQuery: (config: any) => {
    queryConfigs.push(config);
    return { data: { items: ["x"] }, marker: true };
  },
  useInfiniteQuery: (config: any) => {
    infiniteConfigs.push(config);
    return { marker: "infinite" };
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@pos/api-client", () => ({ extractApiError }));
vi.mock("@/features/orders/api/orders", () => api);
vi.mock("@/features/orders/api/createOrder", () => ({ createOrder }));
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (name: string, cb: Function) => {
    const list = realtimeHandlers.get(name) ?? [];
    list.push(cb);
    realtimeHandlers.set(name, list);
  },
}));
vi.mock("@/features/orders/utils/realtime", () => ({
  shouldApplyRealtime: vi.fn((current: any) => !current || current.version !== 99),
  mergeRealtimeTicket: vi.fn((current: any[], ticket: any) => [...current, ticket]),
}));

import { useAddOrderItems } from "../useAddOrderItems";
import { useCreateOrder } from "../useCreateOrder";
import { useLineAdjustments } from "../useLineAdjustments";
import { useOrder } from "../useOrder";
import { useInfiniteOrders, useOrders, useOrdersPage } from "../useOrders";
import { useTransferTable } from "../useTransferTable";
import { useUpdateOrderStatus } from "../useUpdateOrderStatus";
import { useUpdateTicketStatus } from "../useUpdateTicketStatus";
import { useWaiterAttention } from "../useWaiterAttention";

const lastMutation = () => mutationConfigs.at(-1)!;
const handlers = (name: string) => realtimeHandlers.get(name) ?? [];

beforeEach(() => {
  mutationConfigs.length = 0;
  queryConfigs.length = 0;
  infiniteConfigs.length = 0;
  realtimeHandlers.clear();
  vi.clearAllMocks();
});

describe("order mutation hooks", () => {
  it("covers add items success, payload variants, and error messages", async () => {
    useAddOrderItems();
    const c = lastMutation();
    api.addOrderItems.mockResolvedValueOnce({});
    await c.mutationFn({ orderId: "o1", items: [], combos: [], notes: "n", couponCode: "C", promotionIds: ["p"] });
    expect(api.addOrderItems).toHaveBeenLastCalledWith("o1", [], [], "n", { couponCode: "C", promotionIds: ["p"] });
    await c.mutationFn({ orderId: "o1", items: [], combos: [] });
    expect(api.addOrderItems).toHaveBeenLastCalledWith("o1", [], [], undefined, {});
    c.onSuccess({}, { orderId: "o1" });
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
    c.onError({ response: { data: { message: "bad" } } });
    c.onError({ response: {} });
    c.onError(null);
    expect(toast).toHaveBeenCalledWith({ title: "bad", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({ title: "Failed", tone: "danger" });
  });

  it("covers create order mutation and all error extraction branches", async () => {
    useCreateOrder();
    const c = lastMutation();
    await c.mutationFn({ branchId: "b" });
    expect(createOrder).toHaveBeenCalled();
    c.onSuccess();
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
    c.onError({ response: { data: { message: "specific" } } });
    c.onError({ response: { data: { message: 1 } } });
    c.onError(null);
    expect(toast).toHaveBeenCalledWith({ title: "specific", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({ title: "Failed", tone: "danger" });
  });

  it("covers line adjustment void, comp, success and errors", async () => {
    extractApiError.mockReturnValueOnce("Manager approval required").mockReturnValueOnce("").mockReturnValueOnce("boom");
    useLineAdjustments("o1");
    const c = lastMutation();
    await c.mutationFn({ itemId: "i1", action: "void", reason: "r" });
    await c.mutationFn({ itemId: "i2", action: "comp", approvalToken: "a" });
    expect(api.voidOrderItem).toHaveBeenCalled();
    expect(api.compOrderItem).toHaveBeenCalled();
    c.onSuccess({ id: "o1" });
    c.onError(new Error("a"));
    c.onError(new Error("b"));
    c.onError(new Error("c"));
    expect(toast).toHaveBeenCalledWith({ title: "Failed to update item", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({ title: "boom", tone: "danger" });
  });

  it("covers transfer/status/ticket status hooks", async () => {
    useTransferTable("o1");
    let c = lastMutation();
    await c.mutationFn({ newTableId: "t2", reason: "move" });
    c.onSuccess({ id: "o1" }); c.onError();

    useUpdateOrderStatus(); c = lastMutation();
    await c.mutationFn({ id: "o1", status: "READY", reason: "r" });
    c.onSuccess(); c.onError();

    useUpdateTicketStatus(); c = lastMutation();
    await c.mutationFn({ ticketId: "k1", status: "READY" });
    c.onSuccess();
    c.onError({ response: { data: { message: "ticket bad" } } });
    c.onError({ response: { data: { message: 5 } } });
    c.onError(undefined);
    expect(toast).toHaveBeenCalledWith({ title: "ticket bad", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({ title: "Failed to update ticket", tone: "danger" });
  });
});

describe("order query and realtime hooks", () => {
  const order = { id: "o1", version: 1, kitchenTickets: [] } as any;
  const ticket = { id: "k1", orderId: "o1", status: "READY", order: { table: { name: "7" } } } as any;

  it("covers useOrder query and all realtime branches", async () => {
    useOrder("o1");
    const q = queryConfigs.at(-1)!;
    expect(q.enabled).toBe(true);
    await q.queryFn();
    for (const name of ["order.updated", "order.created"]) handlers(name)[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    const updaterCalls = qc.setQueryData.mock.calls.map((x) => x[1]).filter((x) => typeof x === "function");
    expect(updaterCalls[0](undefined)).toEqual(order);
    expect(updaterCalls[0]({ version: 99 })).toEqual({ version: 99 });
    expect(updaterCalls.at(-1)(order).kitchenTickets).toHaveLength(1);
    expect(updaterCalls.at(-1)(undefined)).toBeUndefined();

    realtimeHandlers.clear(); queryConfigs.length = 0;
    useOrder(null);
    const q2 = queryConfigs.at(-1)!;
    expect(q2.enabled).toBe(false);
    handlers("order.updated")[0]!({ payload: order });
    handlers("order.created")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    handlers("kitchen.ticket.updated")[0]!({ payload: { ...ticket, orderId: "other" } });
  });

  it("covers list/page/infinite query callbacks and realtime branches", async () => {
    const filters = { page: 1, limit: 10 } as any;
    const result = useOrders(filters);
    expect(result.data).toEqual(["x"]);
    await queryConfigs.at(-1)!.queryFn();
    handlers("order.created")[0]!({ payload: order });
    handlers("order.updated")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    let fn = qc.setQueryData.mock.calls.at(-1)![1];
    expect(fn(undefined)).toBeUndefined();
    expect(fn(order).kitchenTickets).toHaveLength(1);

    realtimeHandlers.clear(); queryConfigs.length = 0; qc.setQueryData.mockClear();
    useOrdersPage(filters);
    await queryConfigs.at(-1)!.queryFn();
    handlers("order.created")[0]!({ payload: order });
    handlers("order.updated")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    fn = qc.setQueryData.mock.calls.at(-1)![1];
    expect(fn(undefined)).toBeUndefined(); expect(fn(order).kitchenTickets).toHaveLength(1);

    realtimeHandlers.clear(); qc.setQueryData.mockClear();
    useInfiniteOrders({ limit: undefined } as any);
    const iq = infiniteConfigs.at(-1)!;
    await iq.queryFn({ pageParam: 2 });
    expect(api.fetchOrders).toHaveBeenLastCalledWith({ limit: 20, page: 2 });
    expect(iq.getNextPageParam({ pagination: { hasMore: true, page: 2 } })).toBe(3);
    expect(iq.getNextPageParam({ pagination: { hasMore: false, page: 2 } })).toBeUndefined();
    handlers("order.created")[0]!({ payload: order });
    handlers("order.updated")[0]!({ payload: order });
    handlers("kitchen.ticket.updated")[0]!({ payload: ticket });
    fn = qc.setQueryData.mock.calls.at(-1)![1];
    expect(fn(undefined)).toBeUndefined(); expect(fn(order).kitchenTickets).toHaveLength(1);
  });

  it("covers waiter attention ready/non-ready/table/pickup/customer request", () => {
    useWaiterAttention();
    const kh = handlers("kitchen.ticket.updated")[0]!;
    kh({ payload: { ...ticket, status: "PREPARING" } });
    kh({ payload: ticket });
    kh({ payload: { ...ticket, order: {} } });
    handlers("customer.request.created")[0]!({ payload: { type: "CALL_WAITER" } });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Order ready · Table 7" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Order ready for pickup" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "New customer request · call waiter" }));
  });
});
