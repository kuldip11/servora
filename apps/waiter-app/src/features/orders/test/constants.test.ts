import { describe, expect, it } from "vitest";
import {
  orderKeys,
  ORDERS_POLL_INTERVAL_MS,
  ORDER_DETAIL_POLL_INTERVAL_MS,
  STATUS_CONFIG,
  TICKET_STATUS_LABEL,
} from "@/features/orders/constants";

describe("orders constants", () => {
  it("builds stable query keys and polling intervals", () => {
    const scope = ["t1", "b1"] as const;
    expect(orderKeys.all(scope)).toEqual(["waiter-orders", "t1", "b1"]);
    expect(orderKeys.detail(scope, "o1")).toEqual([
      "waiter-orders",
      "t1",
      "b1",
      "detail",
      "o1",
    ]);
    expect(ORDERS_POLL_INTERVAL_MS).toBe(15_000);
    expect(ORDER_DETAIL_POLL_INTERVAL_MS).toBe(10_000);
  });

  it("exposes billing and ticket status labels", () => {
    expect(STATUS_CONFIG.OPEN.label).toBe("Open");
    expect(STATUS_CONFIG.CANCELLED.label).toBe("Cancelled");
    expect(TICKET_STATUS_LABEL).toEqual({
      HELD: "Held",
      FIRED: "Waiting",
      PREPARING: "Cooking",
      READY: "Ready",
      SERVED: "Served",
    });
  });
});
