import { beforeEach, describe, expect, it, vi } from "vitest";

const { realtimeHandlers, toast } = vi.hoisted(() => ({
  realtimeHandlers: new Map<string, Function[]>(),
  toast: vi.fn(),
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (name: string, callback: Function) => {
    const list = realtimeHandlers.get(name) ?? [];
    list.push(callback);
    realtimeHandlers.set(name, list);
  },
}));
import { useWaiterAttention } from "../useWaiterAttention";
const handlers = (name: string) => realtimeHandlers.get(name) ?? [];

beforeEach(() => {
  realtimeHandlers.clear();
  vi.clearAllMocks();
});

describe("useWaiterAttention", () => {
  it("notifies for ready table/pickup tickets and customer requests", () => {
    const ticket = {
      id: "k1",
      orderId: "o1",
      status: "READY",
      order: { table: { name: "7" } },
    } as any;
    useWaiterAttention();
    const kitchenHandler = handlers("kitchen.ticket.updated")[0]!;
    kitchenHandler({ payload: { ...ticket, status: "PREPARING" } });
    kitchenHandler({ payload: ticket });
    kitchenHandler({ payload: { ...ticket, order: {} } });
    handlers("customer.request.created")[0]!({
      payload: { type: "CALL_WAITER" },
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Order ready · Table 7" }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Order ready for pickup" }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New customer request · call waiter" }),
    );
  });
});
