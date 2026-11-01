import { describe, it, expect } from "vitest";
import { calculateBill } from "./WorkflowDemo";
describe("illustrative workflow totals", () => {
  it("applies the sample discount before tax and rounds the total", () => {
    expect(
      calculateBill(
        [
          {
            id: "pizza",
            name: "Pizza",
            choices: "Large",
            unitPrice: 710,
            quantity: 2,
          },
        ],
        true,
      ),
    ).toEqual({
      subtotal: 1420,
      discountAmount: 142,
      tax: 63.9,
      total: 1341.9,
    });
  });
  it("does not retain tax or discount for an empty cart", () => {
    expect(calculateBill([], true)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      tax: 0,
      total: 0,
    });
  });
});
