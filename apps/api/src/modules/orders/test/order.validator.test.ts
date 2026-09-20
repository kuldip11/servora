import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createOrderBody,
  updateOrderStatusBody,
  fireTicketBody,
  orderIdParams,
  orderListQuery,
} from "@/modules/orders/order.validator";

describe("order validators", () => {
  const item = {
    menuItemId: "00000000-0000-4000-8000-000000000101",
    quantity: 1,
  };
  it("accepts valid order creation and rejects invalid type/quantity", () => {
    expect(
      Value.Check(createOrderBody, {
        type: "DINE_IN",
        tableId: "00000000-0000-4000-8000-000000000102",
        items: [item],
      }),
    ).toBe(true);
    expect(Value.Check(createOrderBody, { type: "BAD", items: [item] })).toBe(
      false,
    );
    expect(
      Value.Check(createOrderBody, {
        type: "TAKEAWAY",
        items: [{ ...item, quantity: 0 }],
      }),
    ).toBe(false);
  });
  it("validates status, ticket, id, and optional filters", () => {
    expect(Value.Check(updateOrderStatusBody, { status: "PAID" })).toBe(true);
    expect(Value.Check(updateOrderStatusBody, { status: "NOPE" })).toBe(false);
    expect(Value.Check(fireTicketBody, { items: [item] })).toBe(true);
    expect(
      Value.Check(orderIdParams, {
        id: "00000000-0000-4000-8000-000000000103",
      }),
    ).toBe(true);
    expect(Value.Check(orderIdParams, {})).toBe(false);
    expect(
      Value.Check(orderListQuery, {
        status: "OPEN",
        type: "DINE_IN",
        view: "ACTIVE",
        search: "ABC123",
        page: 2,
        limit: 50,
      }),
    ).toBe(true);
    expect(Value.Check(orderListQuery, { page: 0, limit: 101 })).toBe(false);
    expect(Value.Check(orderListQuery, { view: "UNKNOWN" })).toBe(false);
  });
});
