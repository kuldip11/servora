import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderProgressPanel } from "../OrderProgressPanel";
const order = (over: any = {}) =>
  ({
    id: "o",
    status: "OPEN",
    totalAmount: "21",
    payments: [],
    kitchenTickets: [{ id: "k", ticketNumber: 1, status: "FIRED" }],
    ...over,
  }) as any;
describe("OrderProgressPanel", () => {
  it("owns kitchen progress and ready messaging", () => {
    const { rerender } = render(
      <OrderProgressPanel
        order={order()}
        mode="DINE_IN"
        estimatedTime="10 min"
        payBusy={false}
      />,
    );
    expect(screen.getByText("Estimated ready")).toBeTruthy();
    rerender(
      <OrderProgressPanel
        order={order({
          kitchenTickets: [{ id: "k", ticketNumber: 1, status: "READY" }],
        })}
        mode="TAKEAWAY"
        estimatedTime="10 min"
        payBusy={false}
      />,
    );
    expect(screen.getByText("Your food is ready")).toBeTruthy();
    expect(screen.getByText(/pickup counter/)).toBeTruthy();
  });
  it("owns pending-payment action and busy state", () => {
    const onPay = vi.fn();
    const pending = order({
      status: "PENDING_PAYMENT",
      payments: [{ method: "RAZORPAY", status: "PENDING" }],
      kitchenTickets: [{ id: "k", ticketNumber: 1, status: "PENDING_PAYMENT" }],
    });
    const { rerender } = render(
      <OrderProgressPanel
        order={pending}
        mode="TAKEAWAY"
        estimatedTime="10 min"
        onPay={onPay}
        payBusy={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));
    expect(onPay).toHaveBeenCalled();
    rerender(
      <OrderProgressPanel
        order={pending}
        mode="TAKEAWAY"
        estimatedTime="10 min"
        onPay={onPay}
        payBusy
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Opening payment/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("does not show active progress for terminal orders", () => {
    render(
      <OrderProgressPanel
        order={order({ status: "PAID" })}
        mode="DINE_IN"
        estimatedTime="10 min"
        payBusy={false}
      />,
    );
    expect(screen.queryByText("Estimated ready")).toBeNull();
  });
});
