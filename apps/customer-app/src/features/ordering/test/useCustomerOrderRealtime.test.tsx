import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomerOrderRealtime } from "../useCustomerOrderRealtime";
const tenantId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";
const now = "2026-09-27T00:00:00.000Z";
const envelope = (type: string, payload: unknown) => ({
  type,
  tenantId,
  branchId,
  timestamp: now,
  payload,
});
const orderPayload = {
  id: orderId,
  mergedIntoOrderId: null,
  tenantId,
  branchId,
  tableId: null,
  table: null,
  customerId: null,
  customerGroupId: null,
  status: "OPEN",
  type: "TAKEAWAY",
  billingMode: "LINE_ITEMS",
  coverCount: null,
  perCoverPriceRuleId: null,
  perCoverRate: null,
  subtotal: 10,
  taxAmount: 1,
  discountAmount: 0,
  serviceChargeAmount: 0,
  roundingAdjustment: 0,
  totalAmount: 11,
  notes: null,
  resolutionAsOf: null,
  items: [],
  kitchenTickets: [],
  statusHistory: [],
  payments: [],
  createdAt: now,
  updatedAt: now,
};
const availabilityEnvelope = envelope("menu.availability.updated", {
  source: "INVENTORY",
  entityType: "ITEM",
  entityId: orderId,
  menuItemId: orderId,
  computedStatus: "ACTIVE",
});
class WS {
  static OPEN = 1;
  static instances: WS[] = [];
  readyState = 1;
  sent: any[] = [];
  onopen: any;
  onmessage: any;
  onerror: any;
  onclose: any;
  constructor(public url: string) {
    WS.instances.push(this);
  }
  send(x: any) {
    this.sent.push(x);
  }
  close() {
    this.onclose?.();
  }
}
beforeEach(() => {
  WS.instances = [];
  (globalThis as any).WebSocket = WS;
  vi.useFakeTimers();
  vi.stubEnv("VITE_WS_URL", "");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("customer realtime", () => {
  it("handles no token, connect, messages, ping, errors, close/reconnect and cleanup", async () => {
    const onOrder = vi.fn(),
      onMenu = vi.fn();
    const empty = renderHook(() =>
      useCustomerOrderRealtime(undefined, orderId, onOrder, onMenu),
    );
    expect(empty.result.current).toBe(false);
    const h = renderHook(() =>
      useCustomerOrderRealtime("tok", orderId, onOrder, onMenu),
    );
    const s = WS.instances[0]!;
    expect(s.url).toContain("/customer/events");
    await act(() => s.onopen());
    expect(s.sent[0]).toContain("auth");
    await act(() =>
      s.onmessage({
        data: JSON.stringify({ type: "connected", sessionId: orderId }),
      }),
    );
    expect(h.result.current).toBe(true);
    await act(() => vi.advanceTimersByTime(25000));
    expect(s.sent).toContain("ping");
    await act(() =>
      s.onmessage({
        data: JSON.stringify(envelope("order.updated", orderPayload)),
      }),
    );
    expect(onOrder).toHaveBeenCalled();
    await act(() =>
      s.onmessage({
        data: JSON.stringify(
          envelope("order.updated", {
            ...orderPayload,
            id: "44444444-4444-4444-8444-444444444444",
          }),
        ),
      }),
    );
    await act(() =>
      s.onmessage({
        data: JSON.stringify(availabilityEnvelope),
      }),
    );
    expect(onMenu).toHaveBeenCalled();
    await act(() => s.onmessage({ data: "bad" }));
    await act(() => s.onerror());
    expect(h.result.current).toBe(false);
    await act(() => s.onclose());
    await act(() => vi.advanceTimersByTime(1000));
    expect(WS.instances.length).toBeGreaterThan(1);
    h.unmount();
  });
  it("keeps the socket through callback rerenders and uses the latest committed handlers", async () => {
    const firstOrder = vi.fn(),
      nextOrder = vi.fn(),
      nextMenu = vi.fn();
    const h = renderHook(
      ({
        onOrder,
        onMenu,
      }: {
        onOrder: typeof firstOrder;
        onMenu: typeof nextMenu;
      }) => useCustomerOrderRealtime("token", orderId, onOrder, onMenu),
      { initialProps: { onOrder: firstOrder, onMenu: vi.fn() } },
    );
    const socket = WS.instances[0]!;
    const close = vi.spyOn(socket, "close");
    await act(() =>
      socket.onmessage({
        data: JSON.stringify({ type: "connected", sessionId: orderId }),
      }),
    );
    h.rerender({ onOrder: nextOrder, onMenu: nextMenu });
    await act(() =>
      socket.onmessage({
        data: JSON.stringify(envelope("order.updated", orderPayload)),
      }),
    );
    await act(() =>
      socket.onmessage({ data: JSON.stringify(availabilityEnvelope) }),
    );
    expect(WS.instances).toHaveLength(1);
    expect(close).not.toHaveBeenCalled();
    expect(firstOrder).not.toHaveBeenCalled();
    expect(nextOrder).toHaveBeenCalledOnce();
    expect(nextMenu).toHaveBeenCalledOnce();
    h.unmount();
    expect(close).toHaveBeenCalledOnce();
  });

  it("covers https protocol/default base, capped reconnect and missing optional menu callback", async () => {
    vi.stubEnv("VITE_WS_URL", "wss://example.com/events");
    const h = renderHook(() =>
      useCustomerOrderRealtime("t", undefined, vi.fn()),
    );
    const s = WS.instances[0]!;
    await act(() =>
      s.onmessage({
        data: JSON.stringify(availabilityEnvelope),
      }),
    );
    for (let i = 0; i < 8; i++) {
      await act(() => WS.instances.at(-1)!.onclose());
      await act(() => vi.runOnlyPendingTimers());
    }
    h.unmount();
  });
  it("executes pending reconnect cleanup when dependencies change", async () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { rerender, unmount } = renderHook(
      ({ token }: { token: string | undefined }) =>
        useCustomerOrderRealtime(token, "o", vi.fn()),
      { initialProps: { token: "t" as string | undefined } },
    );
    const s = WS.instances[0]!;
    await act(() => s.onclose());
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    rerender({ token: undefined });
    expect(clearTimeoutSpy).toHaveBeenCalled();
    unmount();
  });
});

describe("customer realtime timer branches", () => {
  it("clears existing ping and pending reconnect timers", async () => {
    vi.stubEnv("VITE_WS_URL", "ws://example.com/events");
    const onOrder = vi.fn(),
      onMenu = vi.fn();
    const h = renderHook(() =>
      useCustomerOrderRealtime("t", "o", onOrder, onMenu),
    );
    const s = WS.instances[0]!;
    await act(() =>
      s.onmessage({
        data: JSON.stringify({ type: "connected", sessionId: orderId }),
      }),
    );
    await act(() =>
      s.onmessage({
        data: JSON.stringify({ type: "connected", sessionId: orderId }),
      }),
    );
    await act(() => s.onclose());
    h.unmount();
    await act(() => vi.runOnlyPendingTimers());
  });
  it("does not ping when socket is not OPEN and ignores duplicate reconnect scheduling", async () => {
    vi.stubEnv("VITE_WS_URL", "ws://example.com/events");
    const h = renderHook(() => useCustomerOrderRealtime("t", "o", vi.fn()));
    const s = WS.instances[0]!;
    s.readyState = 0;
    await act(() =>
      s.onmessage({
        data: JSON.stringify({ type: "connected", sessionId: orderId }),
      }),
    );
    await act(() => vi.advanceTimersByTime(25000));
    expect(s.sent).not.toContain("ping");
    await act(() => s.onclose());
    await act(() => s.onclose());
    h.unmount();
  });
});
