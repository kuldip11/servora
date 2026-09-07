import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
}));
import { vi } from "vitest";
import { OrderFinancialSummary } from "../OrderFinancialSummary";
const order = (over: any = {}) =>
  ({
    subtotal: "100",
    taxAmount: "10",
    discountAmount: "5",
    serviceChargeAmount: "2",
    roundingAdjustment: "0.5",
    totalAmount: "107.5",
    items: [{ taxMode: "INCLUSIVE" }, { taxMode: "EXCLUSIVE" }],
    ...over,
  }) as any;
describe("OrderFinancialSummary", () => {
  it("owns mixed-tax, charges, rounding and discount presentation", () => {
    render(<OrderFinancialSummary order={order()} />);
    expect(screen.getByText("Tax (mixed included/exclusive)")).toBeTruthy();
    expect(screen.getByText("Service charge")).toBeTruthy();
    expect(screen.getByText("Rounding")).toBeTruthy();
    expect(screen.getByText("Discount")).toBeTruthy();
  });
  it("uses simple tax label and omits optional rows", () => {
    render(
      <OrderFinancialSummary
        order={order({
          serviceChargeAmount: "0",
          roundingAdjustment: "0",
          discountAmount: "0",
          items: [{ taxMode: "EXCLUSIVE" }],
        })}
      />,
    );
    expect(screen.getByText("Tax")).toBeTruthy();
    expect(screen.queryByText("Discount")).toBeNull();
  });
});
