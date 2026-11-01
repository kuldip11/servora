import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  billIdParams,
  createPaymentBody,
  createRefundBody,
} from "@/modules/billing/billing.validator";

const orderId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";
const billId = "33333333-3333-4333-8333-333333333333";

describe("billing validators", () => {
  it("accepts valid payment payloads and rejects invalid amounts/methods", () => {
    expect(
      Value.Check(createPaymentBody, {
        orderId,
        method: "CARD",
        amount: 10,
      }),
    ).toBe(true);
    expect(
      Value.Check(createPaymentBody, {
        orderId,
        method: "BITCOIN",
        amount: 10,
      }),
    ).toBe(false);
    expect(
      Value.Check(createPaymentBody, {
        orderId,
        method: "CARD",
        amount: 0,
      }),
    ).toBe(false);
  });

  it("accepts optional payment references", () => {
    expect(
      Value.Check(createPaymentBody, {
        orderId,
        method: "UPI",
        amount: 1,
        reference: "ref-1",
      }),
    ).toBe(true);
  });

  it("enforces refund fields and positive amount", () => {
    expect(
      Value.Check(createRefundBody, {
        paymentId,
        amount: 1,
        reason: "Customer request",
      }),
    ).toBe(true);
    expect(
      Value.Check(createRefundBody, {
        paymentId,
        amount: 0,
        reason: "Customer request",
      }),
    ).toBe(false);
    expect(
      Value.Check(createRefundBody, { paymentId, amount: 1, reason: "" }),
    ).toBe(false);
  });

  it("requires a UUID bill id parameter", () => {
    expect(Value.Check(billIdParams, { id: billId })).toBe(true);
    expect(Value.Check(billIdParams, { id: "b1" })).toBe(false);
    expect(Value.Check(billIdParams, {})).toBe(false);
  });
});
