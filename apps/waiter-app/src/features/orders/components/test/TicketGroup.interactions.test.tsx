import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  StatusBadge: ({ label, tone }: any) => <span data-tone={tone}>{label}</span>,
}));

import { TicketGroup } from "@/features/orders/components/TicketGroup";

const baseItem = {
  id: "item-active",
  quantity: 2,
  menuItemName: "Paneer",
  subtotal: 250,
  itemStatus: "ACTIVE",
  fulfillmentType: "DINE_IN",
};

const ticket = (overrides: any = {}) => ({
  id: "ticket-1",
  ticketNumber: 7,
  status: "READY",
  items: [baseItem],
  ...overrides,
});

describe("TicketGroup interactions", () => {
  it("renders rich item states and invokes every active-item action", () => {
    const onRefill = vi.fn();
    const onRefire = vi.fn();
    const onSeatShares = vi.fn();
    const onAdjust = vi.fn();
    const onMarkServed = vi.fn();
    const items = [
      {
        ...baseItem,
        variantName: "Large",
        weightQuantity: "1.25",
        weightUnit: "kg",
        modifiers: [
          { name: "Spicy", zoneLabel: "LEFT" },
          { name: "Cheese", zoneLabel: "WHOLE" },
        ],
        chefNotes: "No onion",
        comboSlotOption: { isUnlimitedRefill: true },
        seatShares: [{ seatLabel: "S1", shareRatio: 1 }],
      },
      {
        ...baseItem,
        id: "takeaway",
        menuItemName: "Naan",
        fulfillmentType: "TAKEAWAY",
        quantity: 1,
      },
      {
        ...baseItem,
        id: "voided",
        menuItemName: "Rice",
        itemStatus: "VOIDED",
        voidedReason: "Mistake",
      },
      {
        ...baseItem,
        id: "refired",
        menuItemName: "Soup",
        itemStatus: "REFIRED",
        refireReason: "Cold",
        compedAt: "2026-01-01",
      },
      {
        ...baseItem,
        id: "refill-replacement",
        menuItemName: "Drink",
        refiresOrderItemId: "original-123456",
        refireType: "REFILL",
      },
      {
        ...baseItem,
        id: "refire-replacement",
        menuItemName: "Bread",
        refiresOrderItemId: "original-654321",
        refireType: "REFIRE",
      },
      {
        ...baseItem,
        id: "comped",
        menuItemName: "Dessert",
        itemStatus: "COMPED",
        compedReason: "Service recovery",
      },
    ];

    render(
      <TicketGroup
        ticket={ticket({
          notes: "Rush",
          course: { courseNumber: 2, name: "Mains" },
          items,
        }) as any}
        isUpdating={false}
        canVoid
        canComp
        onAdjust={onAdjust}
        onRefill={onRefill}
        onRefire={onRefire}
        onSeatShares={onSeatShares}
        onMarkServed={onMarkServed}
        replacementByOriginalId={new Map([["refired", { id: "replacement-abcdef" }]])}
      />,
    );

    expect(screen.getByText("Course 2 · Mains")).toBeTruthy();
    expect(screen.getByText(/1.25 kg/)).toBeTruthy();
    expect(screen.getByText(/LEFT: Spicy/)).toBeTruthy();
    expect(screen.getByText(/Voided · Mistake/)).toBeTruthy();
    expect(screen.getByText(/replacement #abcdef/)).toBeTruthy();
    expect(screen.getByText(/original comped/)).toBeTruthy();
    expect(screen.getByText(/REFILL · INCLUDED/)).toBeTruthy();
    expect(screen.getByText(/REFIRE replacement/)).toBeTruthy();
    expect(screen.getByText(/Comped · Service recovery/)).toBeTruthy();
    expect(screen.getByText("Takeaway")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Refill/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /Refire/ })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Split item" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Void" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Comp" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Mark Round Served/ }));

    expect(onRefill).toHaveBeenCalledWith("item-active");
    expect(onRefire).toHaveBeenCalledWith("item-active");
    expect(onSeatShares).toHaveBeenCalledWith("item-active", [{ seatLabel: "S1", shareRatio: 1 }]);
    expect(onAdjust).toHaveBeenCalledWith("item-active", "void");
    expect(onAdjust).toHaveBeenCalledWith("item-active", "comp");
    expect(onMarkServed).toHaveBeenCalledWith("ticket-1");
  });

  it("covers held/unknown status, fallback labels, pending replacement, and missing optional actions", () => {
    const onFireHeld = vi.fn();
    const { rerender } = render(
      <TicketGroup
        ticket={ticket({
          status: "HELD",
          course: { courseNumber: 1, name: "" },
          items: [{ ...baseItem, fulfillmentType: undefined }],
        }) as any}
        isUpdating
        onFireHeld={onFireHeld}
      />,
    );
    expect(screen.getByText("Course 1")).toBeTruthy();
    const fire = screen.getByRole("button", { name: "Fire Course Now" });
    expect((fire as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(fire);
    expect(onFireHeld).not.toHaveBeenCalled();

    rerender(
      <TicketGroup
        ticket={ticket({
          status: "CUSTOM_STATUS",
          items: [{ ...baseItem, id: "pending", itemStatus: "REFIRED", refireReason: "", compedAt: null }],
        }) as any}
        isUpdating={false}
      />,
    );
    expect(screen.getByText("Round 7")).toBeTruthy();
    expect(screen.getByText("CUSTOM_STATUS")).toBeTruthy();
    expect(screen.getByText(/replacement #pending/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Void" })).toBeNull();
  });
});
