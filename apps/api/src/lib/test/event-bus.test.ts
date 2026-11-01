import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeEvent } from "@pos/contracts";

const { publish } = vi.hoisted(() => ({
  publish: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../redis", () => ({
  publisher: { publish },
  REDIS_CHANNELS: {
    ORDER_EVENTS: "orders",
    KITCHEN_EVENTS: "kitchen",
    INVENTORY_EVENTS: "inventory",
    TABLE_EVENTS: "table",
  },
}));

import { eventBus } from "@/lib/event-bus";

const tenantId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const entityId = "33333333-3333-4333-8333-333333333333";
const orderId = "44444444-4444-4444-8444-444444444444";
const now = "2026-09-27T00:00:00.000Z";

const cases: Array<[RealtimeEvent, string]> = [
  [
    {
      type: "payment.updated",
      payload: {
        paymentId: entityId,
        orderId,
        status: "SUCCESS",
        amount: 42,
      },
    },
    "orders",
  ],
  [
    {
      type: "kitchen.ticket.updated",
      payload: {
        id: entityId,
        tenantId,
        branchId,
        orderId,
        ticketNumber: 1,
        status: "READY",
        courseId: null,
        course: null,
        notes: null,
        items: [],
        firedAt: now,
        readyAt: now,
        servedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    "kitchen",
  ],
  [
    {
      type: "inventory.low_stock",
      payload: {
        id: entityId,
        tenantId,
        branchId,
        name: "Rice",
        unit: "KG",
        currentStock: 2,
        minimumStock: 5,
        reorderPoint: 8,
        costPerUnit: 12,
        isActive: true,
      },
    },
    "inventory",
  ],
  [
    {
      type: "menu.availability.updated",
      payload: {
        source: "INVENTORY",
        entityType: "ITEM",
        entityId,
        menuItemId: entityId,
        computedStatus: "ACTIVE",
      },
    },
    "inventory",
  ],
  [
    {
      type: "table.updated",
      payload: {
        id: entityId,
        tenantId,
        branchId,
        name: "T1",
        publicQrToken: orderId,
        capacity: 4,
        status: "AVAILABLE",
        section: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    },
    "table",
  ],
];

describe("eventBus", () => {
  beforeEach(() => publish.mockClear());

  it.each(cases)("routes $type to %s", async (event, channel) => {
    await eventBus.publish(event, tenantId, branchId);
    expect(publish).toHaveBeenCalledWith(channel, expect.any(String));
    expect(JSON.parse(publish.mock.calls[0]![1])).toMatchObject({
      type: event.type,
      tenantId,
      branchId,
      payload: event.payload,
    });
  });

  it("rejects an invalid payload before publication", async () => {
    await expect(
      eventBus.publish(
        {
          type: "payment.updated",
          payload: { paymentId: "not-a-uuid" },
        } as RealtimeEvent,
        tenantId,
        branchId,
      ),
    ).rejects.toThrow("Invalid realtime payload for payment.updated");
    expect(publish).not.toHaveBeenCalled();
  });

  it("delivers a published event to local domain subscribers with actor context", async () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.subscribe(
      "menu.availability.updated",
      handler,
    );
    const event = cases[3]![0] as Extract<
      RealtimeEvent,
      { type: "menu.availability.updated" }
    >;
    await eventBus.publish(event, tenantId, branchId, {
      userId: "u1",
      requestId: "r1",
    });
    expect(handler).toHaveBeenCalledWith({
      event,
      tenantId,
      branchId,
      context: { userId: "u1", requestId: "r1" },
    });
    unsubscribe();
  });
});
