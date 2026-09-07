import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderStatus } from "../OrderStatus";
const baseOrder = (over: any = {}) =>
  ({
    id: "order123456",
    status: "OPEN",
    subtotal: "20",
    taxAmount: "2",
    discountAmount: "1",
    totalAmount: "21",
    payments: [],
    kitchenTickets: [{ id: "k1", ticketNumber: 1, status: "FIRED" }],
    items: [
      {
        id: "i1",
        quantity: 2,
        menuItemName: "Pizza",
        variantName: "Large",
        subtotal: "20",
        fulfillmentType: "DINE_IN",
        modifiers: [],
      },
    ],
    ...over,
  }) as any;
const props = (over: any = {}) => ({
  order: baseOrder(),
  mode: "DINE_IN" as const,
  table: "7",
  estimatedTime: "10 min",
  onMenu: vi.fn(),
  live: true,
  onRequest: vi.fn(),
  requestBusy: false,
  requestMessage: null,
  ...over,
});
describe("OrderStatus", () => {
  it("composes current status and navigation around extracted panels", () => {
    const p = props();
    render(<OrderStatus {...p} />);
    expect(screen.getByText("Order received.")).toBeTruthy();
    expect(screen.getByText(/1 items/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Menu/i })[0]!);
    expect(p.onMenu).toHaveBeenCalled();
  });
  it("owns headline/live state for preparing, ready, takeaway and terminal orders", () => {
    const { rerender } = render(
      <OrderStatus
        {...props({
          live: false,
          order: baseOrder({
            kitchenTickets: [{ id: "k", ticketNumber: 1, status: "PREPARING" }],
          }),
        })}
      />,
    );
    expect(screen.getByText("It's cooking.")).toBeTruthy();
    expect(screen.getByText("Reconnecting")).toBeTruthy();
    rerender(
      <OrderStatus
        {...props({
          mode: "TAKEAWAY",
          table: "Takeaway",
          order: baseOrder({
            kitchenTickets: [{ id: "k", ticketNumber: 1, status: "READY" }],
          }),
        })}
      />,
    );
    expect(screen.getByText("Ready for pickup.")).toBeTruthy();
    rerender(
      <OrderStatus {...props({ order: baseOrder({ status: "CANCELLED" }) })} />,
    );
    expect(screen.getByText("Order cancelled.")).toBeTruthy();
  });
  it("scrolls to the extracted service section from bottom navigation", () => {
    const scroll = vi.fn();
    vi.spyOn(document, "getElementById").mockReturnValue({
      scrollIntoView: scroll,
    } as any);
    render(<OrderStatus {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Service/i }));
    expect(scroll).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
