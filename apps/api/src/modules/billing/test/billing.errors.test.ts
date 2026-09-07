import { describe, expect, it } from "vitest";
import {
  billNotFound,
  billSelectionRequired,
  invalidBillAllocation,
  orderNotFound,
  paymentExceedsDueAmount,
  paymentNotFound,
  paymentNotRefundable,
  refundExceedsPaymentAmount,
  splitBillNotAllowed,
} from "@/modules/billing/billing.errors";

describe("billing errors", () => {
  it("creates stable not-found errors with preserved reasons", () => {
    expect(orderNotFound("o1").details).toMatchObject({ reason: "ORDER_NOT_FOUND" });
    expect(paymentNotFound("p1").details).toMatchObject({ reason: "PAYMENT_NOT_FOUND" });
    expect(billNotFound("b1").details).toMatchObject({ reason: "BILL_NOT_FOUND" });
  });

  it("maps payment and bill rules to stable domain errors", () => {
    expect(paymentNotRefundable().details).toMatchObject({ reason: "PAYMENT_NOT_REFUNDABLE" });
    expect(refundExceedsPaymentAmount().details).toMatchObject({ reason: "REFUND_AMOUNT_EXCEEDS_PAYMENT" });
    expect(paymentExceedsDueAmount().details).toMatchObject({ reason: "PAYMENT_AMOUNT_EXCEEDS_DUE" });
    expect(billSelectionRequired().details).toMatchObject({ reason: "BILL_REQUIRED" });
    expect(splitBillNotAllowed("BILL_ALREADY_PAID").message).toBe("A paid order cannot be split");
    expect(splitBillNotAllowed("TOO_MANY_BILLS").message).toBe("Each split bill must contain an active item");
  });

  it("maps every allocation reason and the fallback message", () => {
    const expected: Record<string, string> = {
      EMPTY_BILL: "Every bill must contain at least one active item",
      UNKNOWN_ITEM: "The allocation contains an item that is not active on this order",
      DUPLICATE_ITEM: "An active item cannot be assigned to more than one bill",
      UNASSIGNED_ITEM: "Every active item must be assigned to exactly one bill",
      NO_SEAT_LABELS: "Add a seat or diner label to at least one active item before splitting by seat",
      SPLIT_COMBO_GROUP: "A combo and all of its component items must stay on the same bill",
      SOMETHING_ELSE: "The item allocation is invalid",
    };
    for (const [reason, message] of Object.entries(expected)) {
      const error = invalidBillAllocation(reason);
      expect(error.message).toBe(message);
      expect(error.details).toMatchObject({ reason });
    }
  });

});
