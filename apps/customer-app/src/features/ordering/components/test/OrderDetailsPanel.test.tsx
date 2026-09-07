import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderDetailsPanel } from "../OrderDetailsPanel";
const order = (over: any = {}) =>
  ({
    id: "o",
    subtotal: "20",
    taxAmount: "2",
    discountAmount: "1",
    totalAmount: "21",
    kitchenTickets: [
      { id: "a", ticketNumber: 1, status: "PREPARING" },
      { id: "b", ticketNumber: 2, status: "SERVED" },
    ],
    items: [
      {
        id: "i1",
        quantity: 2,
        menuItemName: "Pizza",
        variantName: "Large",
        subtotal: "20",
        fulfillmentType: "DINE_IN",
        modifiers: [{ quantity: 2, name: "Cheese" }],
      },
      {
        id: "i2",
        quantity: 1,
        menuItemName: "Soup",
        variantName: null,
        subtotal: "5",
        fulfillmentType: "TAKEAWAY",
        modifiers: [],
      },
    ],
    ...over,
  }) as any;
describe("OrderDetailsPanel", () => {
  it("owns item groups, modifier details, totals and kitchen rounds", () => {
    render(<OrderDetailsPanel order={order()} />);
    expect(screen.getByText("Order details")).toBeTruthy();
    expect(screen.getByText(/2 × Cheese/)).toBeTruthy();
    expect(screen.getByText("Discount")).toBeTruthy();
    expect(screen.getByText("Kitchen rounds")).toBeTruthy();
    expect(screen.getByText("Eat here")).toBeTruthy();
    expect(screen.getByText("Takeaway")).toBeTruthy();
  });
  it("omits discount and rounds when they do not apply", () => {
    render(
      <OrderDetailsPanel
        order={order({
          discountAmount: "0",
          kitchenTickets: [{ id: "a", ticketNumber: 1, status: "FIRED" }],
          items: [],
        })}
      />,
    );
    expect(screen.queryByText("Discount")).toBeNull();
    expect(screen.queryByText("Kitchen rounds")).toBeNull();
  });
});
