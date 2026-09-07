import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  StatusBadge: ({ label }: any) => <span>{label}</span>,
}));
import { OrderTicketsSection } from "../OrderTicketsSection";
const item = (over: any = {}) => ({
  id: "i1",
  menuItemId: "m1",
  menuItemName: "Pizza",
  quantity: 1,
  subtotal: "10",
  itemStatus: "ACTIVE",
  modifiers: [{ modifierId: "mod", name: "Cheese", quantity: 2 }],
  seatShares: [],
  ...over,
});
const order = (ticketStatus = "HELD", over: any = {}) =>
  ({
    status: "OPEN",
    items: [item()],
    kitchenTickets: [
      {
        id: "k1",
        ticketNumber: 1,
        status: ticketStatus,
        notes: "rush",
        items: [item()],
      },
    ],
    ...over,
  }) as any;
describe("OrderTicketsSection", () => {
  it("owns ticket status actions and item operations", () => {
    const update = {
      mutate: vi.fn(),
      isPending: false,
      variables: undefined,
    } as any;
    const refire = vi.fn(),
      seat = vi.fn(),
      voidItem = vi.fn(),
      comp = vi.fn();
    const { rerender } = render(
      <OrderTicketsSection
        order={order("HELD")}
        canFire
        canKitchen
        canServe
        hasPermission={() => true}
        updateTicketMutation={update}
        voidItemMutation={{ isPending: false } as any}
        compItemMutation={{ isPending: false } as any}
        onRefire={refire}
        onSeatShare={seat}
        onVoid={voidItem}
        onComp={comp}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fire Course Now" }));
    expect(update.mutate).toHaveBeenCalledWith({
      ticketId: "k1",
      status: "FIRED",
    });
    rerender(
      <OrderTicketsSection
        order={order("READY")}
        canFire
        canKitchen
        canServe
        hasPermission={() => true}
        updateTicketMutation={update}
        voidItemMutation={{ isPending: false } as any}
        compItemMutation={{ isPending: false } as any}
        onRefire={refire}
        onSeatShare={seat}
        onVoid={voidItem}
        onComp={comp}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Mark Served/ }));
    fireEvent.click(screen.getByRole("button", { name: /Refire/ }));
    fireEvent.click(screen.getByRole("button", { name: /Split across seats/ }));
    fireEvent.click(screen.getByRole("button", { name: "Void" }));
    fireEvent.click(screen.getByRole("button", { name: "Comp" }));
    expect(refire).toHaveBeenCalledWith("i1");
    expect(seat).toHaveBeenCalledWith({ itemId: "i1", shares: [] });
    expect(voidItem).toHaveBeenCalledWith("i1");
    expect(comp).toHaveBeenCalledWith("i1");
  });
  it("owns refire/void/comp item state messaging", () => {
    render(
      <OrderTicketsSection
        order={order("FIRED", {
          items: [item({ id: "replacement", refiresOrderItemId: "i1" })],
          kitchenTickets: [
            {
              id: "k",
              ticketNumber: 1,
              status: "FIRED",
              items: [
                item({
                  itemStatus: "REFIRED",
                  refireReason: "Burned",
                  compedAt: "x",
                }),
                item({
                  id: "v",
                  itemStatus: "VOIDED",
                  voidedReason: "Mistake",
                }),
                item({ id: "c", itemStatus: "COMPED", compedReason: "Guest" }),
              ],
            },
          ],
        })}
        canFire
        canKitchen
        canServe
        hasPermission={() => false}
        updateTicketMutation={{ isPending: false } as any}
        voidItemMutation={{ isPending: false } as any}
        compItemMutation={{ isPending: false } as any}
        onRefire={vi.fn()}
        onSeatShare={vi.fn()}
        onVoid={vi.fn()}
        onComp={vi.fn()}
      />,
    );
    expect(screen.getByText(/Refired/)).toBeTruthy();
    expect(screen.getByText(/Voided/)).toBeTruthy();
    expect(screen.getByText(/Comped/)).toBeTruthy();
  });
});
