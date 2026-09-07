import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { KitchenTicket } from "@pos/types";
import { TicketItems } from "../TicketItems";
import { ticket } from "../../test/fixtures";
import { filterTicketForStation } from "../../utils/ticket";

describe("TicketItems", () => {
  it("renders items and notes", () => {
    const html = renderToStaticMarkup(
      <TicketItems notes={ticket.notes} items={ticket.items} />,
    );
    expect(html).toContain("Burger");
    expect(html).toContain("Large");
    expect(html).toContain("Cheese");
    expect(html).toContain("No onion");
  });

  it("does not render non-preparable combo parent rows", () => {
    const parent = {
      ...ticket.items[0]!,
      id: "combo-parent",
      menuItemId: null,
      menuItemName: "Lunch Combo",
      comboId: "combo-1",
      comboGroupId: "group-1",
    };
    const child = {
      ...ticket.items[0]!,
      id: "combo-child",
      comboId: "combo-1",
      comboGroupId: "group-1",
    };
    const html = renderToStaticMarkup(
      <TicketItems notes={null} items={[parent, child]} />,
    );
    expect(html).not.toContain("Lunch Combo");
    expect(html).toContain("Burger");
  });

  it("splits combo components by station while preserving the shared combo marker", () => {
    const grillChild = {
      ...ticket.items[0]!,
      id: "combo-grill",
      menuItemName: "Grilled Steak",
      stationId: "grill",
      comboId: "combo-1",
      comboGroupId: "shared-group",
    };
    const coldChild = {
      ...ticket.items[0]!,
      id: "combo-cold",
      menuItemName: "Garden Salad",
      stationId: "cold",
      comboId: "combo-1",
      comboGroupId: "shared-group",
    };
    const comboTicket = { ...ticket, items: [grillChild, coldChild] };
    const grill = filterTicketForStation(comboTicket, "grill");
    const cold = filterTicketForStation(comboTicket, "cold");
    expect(grill?.items.map((item) => item.id)).toEqual(["combo-grill"]);
    expect(cold?.items.map((item) => item.id)).toEqual(["combo-cold"]);
    const grillHtml = renderToStaticMarkup(
      <TicketItems notes={null} items={grill!.items} />,
    );
    const coldHtml = renderToStaticMarkup(
      <TicketItems notes={null} items={cold!.items} />,
    );
    expect(grillHtml).toContain("Grilled Steak");
    expect(grillHtml).not.toContain("Garden Salad");
    expect(coldHtml).toContain("Garden Salad");
    expect(coldHtml).not.toContain("Grilled Steak");
    expect(grillHtml).toContain("Combo · shared");
    expect(coldHtml).toContain("Combo · shared");
  });

  it("renders zones, captured weight, and distinguishes REFILL from REFIRE", () => {
    const base = ticket.items[0]!;
    const zoned = {
      ...base,
      id: "zone-line",
      weightQuantity: 450,
      weightUnit: "G" as const,
      modifiers: [
        { ...base.modifiers[0]!, name: "Pepperoni", zoneLabel: "LEFT" },
        {
          ...base.modifiers[0]!,
          modifierId: "mod2",
          name: "Mushroom",
          zoneLabel: "RIGHT",
        },
      ],
    };
    const refill = {
      ...base,
      id: "refill-line",
      menuItemName: "Rice",
      refiresOrderItemId: "rice-original",
      refireType: "REFILL" as const,
    };
    const refire = {
      ...base,
      id: "refire-line",
      menuItemName: "Steak",
      refiresOrderItemId: "steak-original",
      refireType: "REFIRE" as const,
    };
    const html = renderToStaticMarkup(
      <TicketItems notes={null} items={[zoned, refill, refire]} />,
    );
    expect(html).toContain("LEFT: Pepperoni");
    expect(html).toContain("RIGHT: Mushroom");
    expect(html).toContain("450 G");
    expect(html).toContain("REFILL · INCLUDED");
    expect(html).toContain("REFIRE");
  });

  it("renders item status, modifier, weight, combo and fulfillment branches", () => {
    const base = ticket.items[0]!;
    const items = [
      {
        ...base,
        id: "voided",
        itemStatus: "VOIDED" as const,
        variantName: null,
        chefNotes: null,
        fulfillmentType: undefined,
        weightQuantity: 250,
        weightUnit: undefined,
        comboGroupId: "abcdef123",
        modifiers: [
          {
            ...base.modifiers[0]!,
            zoneLabel: "WHOLE",
            quantity: 2,
            modifierGroupName: null,
          },
          {
            ...base.modifiers[0]!,
            modifierId: "mod-left",
            zoneLabel: "LEFT",
            quantity: 1,
            modifierGroupName: "Toppings",
          },
        ],
      },
      {
        ...base,
        id: "refired",
        itemStatus: "REFIRED" as const,
        fulfillmentType: "TAKEAWAY" as const,
        refiresOrderItemId: "original",
        refireType: "REFIRE" as const,
        modifiers: [],
      },
      {
        ...base,
        id: "refill",
        itemStatus: "ACTIVE" as const,
        fulfillmentType: "TAKEAWAY" as const,
        refiresOrderItemId: "original-2",
        refireType: "REFILL" as const,
        weightQuantity: 125,
        weightUnit: "G" as const,
      },
    ] as KitchenTicket["items"];
    const html = renderToStaticMarkup(
      <TicketItems notes={null} items={items} />,
    );
    expect(html).toContain("VOIDED");
    expect(html).toContain("REFIRED · replacement sent");
    expect(html).toContain("REFILL · INCLUDED");
    expect(html).toContain("REFIRE");
    expect(html).toContain("250 ");
    expect(html).toContain("125 G");
    expect(html).toContain("Combo · abcdef");
    expect(html).toContain("LEFT:");
    expect(html).toContain("×2");
    expect(html).toContain("(Toppings)");
    expect(html).toContain("Takeaway");
  });
});
