import { describe, expect, it } from "vitest";
import { customerKeys } from "./customer.keys";

describe("customerKeys", () => {
  it("isolates bootstrap and order data by QR scope and session", () => {
    expect(customerKeys.bootstrap("qr-a", "scope-a")).not.toEqual(
      customerKeys.bootstrap("qr-b", "scope-b"),
    );
    expect(customerKeys.order("scope-a", "session-a", "order-1")).not.toEqual(
      customerKeys.order("scope-a", "session-b", "order-1"),
    );
    expect(customerKeys.order("scope-a", "session-a", "order-1")).toEqual([
      "customer",
      "session",
      "scope-a",
      "session-a",
      "orders",
      "order-1",
    ]);
  });
});
