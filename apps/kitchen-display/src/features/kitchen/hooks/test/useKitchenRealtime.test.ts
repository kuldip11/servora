import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setQueryData: vi.fn(),
  useQueryClient: vi.fn(),
  handlers: [] as Array<[string, (event: any) => void]>,
}));

mocks.useQueryClient.mockReturnValue({ setQueryData: mocks.setQueryData });
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: mocks.useQueryClient,
}));
vi.mock("../../../../shared/lib/realtime", () => ({
  useConnectionStatus: () => true,
  useRealtimeEvent: (type: string, handler: (event: any) => void) =>
    mocks.handlers.push([type, handler]),
}));

import { createRealtimeClient } from "@pos/realtime";
import type { RealtimeEvent, KitchenTicket } from "@pos/types";
import {
  useKitchenRealtime,
  mergeKitchenTicketIntoQueue,
} from "@/features/kitchen/hooks/useKitchenRealtime";
import {
  KITCHEN_TICKETS_QUERY_KEY,
  kitchenTicketsQueryKey,
} from "@/features/kitchen/hooks/useKitchenTickets";

beforeEach(() => {
  mocks.handlers.length = 0;
  mocks.setQueryData.mockClear();
  mocks.useQueryClient.mockReturnValue({ setQueryData: mocks.setQueryData });
});

describe("useKitchenRealtime", () => {
  it("upserts full ticket payloads directly into the KDS cache", () => {
    expect(useKitchenRealtime()).toEqual({ connected: true });
    expect(mocks.handlers.map(([type]) => type)).toEqual([
      "kitchen.ticket.created",
      "kitchen.ticket.updated",
      "order.item.voided",
    ]);
    const ticket = {
      id: "t1",
      status: "FIRED",
      firedAt: "2026-08-27T10:00:00.000Z",
    };
    mocks.handlers[0]![1]({ type: "kitchen.ticket.created", payload: ticket });
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      KITCHEN_TICKETS_QUERY_KEY,
      expect.any(Function),
    );
    const updater = mocks.setQueryData.mock.calls[0]![1];
    expect(updater([])).toEqual([ticket]);
  });

  it("removes served tickets from the visible queue", () => {
    useKitchenRealtime();
    const updaterCall = () => {
      mocks.handlers[1]![1]({
        type: "kitchen.ticket.updated",
        payload: {
          id: "t1",
          status: "SERVED",
          firedAt: "2026-08-27T10:00:00.000Z",
        },
      });
      return mocks.setQueryData.mock.calls.at(-1)![1];
    };
    expect(updaterCall()([{ id: "t1", status: "READY" }])).toEqual([]);
  });
  it("ignores stale ticket events", () => {
    const current = [
      { id: "t1", status: "READY", updatedAt: "2026-08-27T12:00:00.000Z" },
    ];
    const stale = {
      id: "t1",
      status: "PREPARING",
      updatedAt: "2026-08-27T11:00:00.000Z",
    };
    expect(mergeKitchenTicketIntoQueue(current as any, stale as any)).toBe(
      current,
    );
  });

  it("sorts tickets with and without firedAt and handles an undefined current queue", () => {
    const later = {
      id: "later",
      status: "FIRED",
      firedAt: "2026-08-27T12:00:00.000Z",
    };
    const held = { id: "held", status: "HELD", firedAt: null };
    const first = mergeKitchenTicketIntoQueue(undefined, later as any);
    expect(first).toEqual([later]);
    const sorted = mergeKitchenTicketIntoQueue(first as any, held as any);
    expect(sorted.map((value) => value.id)).toEqual(["held", "later"]);
    const reverse = mergeKitchenTicketIntoQueue([held] as any, later as any);
    expect(reverse.map((value) => value.id)).toEqual(["held", "later"]);
  });

  it("projects a void event onto the assigned station immediately without polling", () => {
    useKitchenRealtime("grill");
    const voidHandler = mocks.handlers.find(
      ([type]) => type === "order.item.voided",
    )?.[1];
    expect(voidHandler).toBeDefined();
    const incoming = {
      id: "t-void",
      status: "PREPARING",
      firedAt: "2026-08-27T10:00:00.000Z",
      items: [
        {
          id: "grill-line",
          menuItemId: "m1",
          stationId: "grill",
          itemStatus: "VOIDED",
        },
        {
          id: "cold-line",
          menuItemId: "m2",
          stationId: "cold",
          itemStatus: "ACTIVE",
        },
        {
          id: "fallback",
          menuItemId: "m3",
          stationId: null,
          itemStatus: "ACTIVE",
        },
      ],
    };
    const started = performance.now();
    voidHandler?.({ type: "order.item.voided", payload: incoming });
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(50);
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      kitchenTicketsQueryKey("grill"),
      expect.any(Function),
    );
    const updater = mocks.setQueryData.mock.calls.at(-1)?.[1];
    expect(updater([])[0].items.map((item: { id: string }) => item.id)).toEqual(
      ["grill-line", "fallback"],
    );
  });
});

class TestRealtimeSocket {
  static instances: TestRealtimeSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  readyState = TestRealtimeSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    TestRealtimeSocket.instances.push(this);
  }
  close() {
    this.onclose?.();
  }
  message(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe("void realtime transport benchmark", () => {
  it("delivers void-to-KDS state through the real shared WebSocket decoder within the created-event latency bound", () => {
    TestRealtimeSocket.instances = [];
    vi.stubGlobal("WebSocket", TestRealtimeSocket);
    const client = createRealtimeClient<RealtimeEvent>({
      url: "wss://servora.test/ws/events",
      getAccessToken: () => "token",
      getTenantId: () => "t1",
      getBranchId: () => "b1",
    });
    let state: KitchenTicket[] = [];
    client.subscribe((event) => {
      if (
        event.type === "order.item.voided" ||
        event.type === "kitchen.ticket.created"
      ) {
        state = mergeKitchenTicketIntoQueue(state, event.payload, "grill");
      }
    });
    const socket = TestRealtimeSocket.instances[0]!;
    const base = {
      id: "ticket-transport",
      tenantId: "t1",
      branchId: "b1",
      orderId: "o1",
      ticketNumber: 1,
      status: "PREPARING",
      courseId: null,
      notes: null,
      firedAt: "2026-08-30T10:00:00.000Z",
      readyAt: null,
      servedAt: null,
      createdAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:00:00.000Z",
      items: [
        {
          id: "grill",
          orderId: "o1",
          menuItemId: "m1",
          menuItemName: "Steak",
          variantId: null,
          variantName: null,
          quantity: 1,
          unitPrice: 10,
          subtotal: 10,
          taxRate: 0,
          taxMode: "EXCLUSIVE",
          pricingAttribution: null,
          chefNotes: null,
          fulfillmentType: "DINE_IN",
          stationId: "grill",
          menuChangeEventId: null,
          itemStatus: "ACTIVE",
          refiresOrderItemId: null,
          refireReason: null,
          refiredBy: null,
          refiredAt: null,
          voidedReason: null,
          voidedBy: null,
          voidedAt: null,
          voidedReasonId: null,
          compedReason: null,
          compedBy: null,
          compedAt: null,
          compedReasonId: null,
          modifiers: [],
        },
      ],
    } as unknown as KitchenTicket;

    const createdStart = performance.now();
    socket.message({ type: "kitchen.ticket.created", payload: base });
    const createdElapsed = performance.now() - createdStart;
    expect(state).toHaveLength(1);

    const voided = {
      ...base,
      items: base.items.map((item) => ({
        ...item,
        itemStatus: "VOIDED" as const,
        voidedReason: "guest changed mind",
      })),
    };
    const voidStart = performance.now();
    socket.message({ type: "order.item.voided", payload: voided });
    const voidElapsed = performance.now() - voidStart;
    expect(state[0]?.items[0]?.itemStatus).toBe("VOIDED");

    expect(voidElapsed).toBeLessThanOrEqual(
      Math.max(50, createdElapsed * 5 + 5),
    );
  });
});
