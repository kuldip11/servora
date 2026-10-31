import { describe, expect, it } from "vitest";
import { isRealtimeEnvelope } from "@pos/contracts";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "../realtime.mapper";

const now = new Date("2026-09-27T00:00:00.000Z");

describe("realtime mapper", () => {
  it("maps a repository order into a valid public realtime payload", () => {
    const payload = toRealtimeOrderPayload({
      id: "00000000-0000-4000-8000-000000000001",
      mergedIntoOrderId: null,
      tenantId: "00000000-0000-4000-8000-000000000002",
      branchId: "00000000-0000-4000-8000-000000000003",
      tableId: null,
      table: null,
      customerId: null,
      customerGroupId: null,
      customerSessionId: "00000000-0000-4000-8000-000000000004",
      status: "OPEN",
      type: "TAKEAWAY",
      billingMode: "LINE_ITEMS",
      coverCount: null,
      perCoverPriceRuleId: null,
      perCoverRate: null,
      subtotal: "100.00",
      taxAmount: "5.00",
      discountAmount: "0.00",
      serviceChargeAmount: "0.00",
      roundingAdjustment: "0.00",
      totalAmount: "105.00",
      notes: null,
      resolutionAsOf: null,
      items: [],
      kitchenTickets: [],
      statusHistory: [],
      payments: [],
      createdAt: now,
      updatedAt: now,
    } as never);

    expect(payload.customerSessionId).toBe(
      "00000000-0000-4000-8000-000000000004",
    );
    expect(
      isRealtimeEnvelope({
        type: "order.updated",
        tenantId: "00000000-0000-4000-8000-000000000002",
        branchId: "00000000-0000-4000-8000-000000000003",
        timestamp: now.toISOString(),
        payload,
      }),
    ).toBe(true);
  });

  it("maps a kitchen ticket and explicit routing context into a valid payload", () => {
    const payload = toRealtimeKitchenTicketPayload(
      {
        id: "00000000-0000-4000-8000-000000000005",
        tenantId: "00000000-0000-4000-8000-000000000002",
        branchId: "00000000-0000-4000-8000-000000000003",
        orderId: "00000000-0000-4000-8000-000000000001",
        ticketNumber: 1,
        status: "FIRED",
        courseId: null,
        course: null,
        notes: null,
        items: [],
        firedAt: now,
        readyAt: null,
        servedAt: null,
        createdAt: now,
        updatedAt: now,
      } as never,
      {
        customerSessionId: "00000000-0000-4000-8000-000000000004",
        order: {
          id: "00000000-0000-4000-8000-000000000001",
          type: "DINE_IN",
          tableId: "00000000-0000-4000-8000-000000000006",
          table: {
            id: "00000000-0000-4000-8000-000000000006",
            name: "T1",
            section: "Main",
          } as never,
        },
      },
    );

    expect(payload.customerSessionId).toBe(
      "00000000-0000-4000-8000-000000000004",
    );
    expect(payload.order?.table?.name).toBe("T1");
    expect(
      isRealtimeEnvelope({
        type: "kitchen.ticket.updated",
        tenantId: "00000000-0000-4000-8000-000000000002",
        branchId: "00000000-0000-4000-8000-000000000003",
        timestamp: now.toISOString(),
        payload,
      }),
    ).toBe(true);
  });
});
