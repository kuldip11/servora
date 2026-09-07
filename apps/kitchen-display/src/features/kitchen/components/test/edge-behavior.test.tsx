import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { KitchenTicket } from "@pos/types";
import { TicketHeader } from "@/features/kitchen/components/TicketHeader";
import { TicketItems } from "@/features/kitchen/components/TicketItems";
import { Timer } from "@/features/kitchen/components/Timer";
import { ticket } from "@/features/kitchen/test/fixtures";

vi.mock("@pos/ui", () => ({
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

const header = (value: KitchenTicket) =>
  renderToStaticMarkup(
    <TicketHeader
      ticket={value}
      statusLabel="Status"
      statusTone="info"
      statusTextClass="status-class"
    />,
  );

describe("ticket display edge coverage", () => {
  it("renders takeaway, delivery, course, round, held, and default fulfillment headers", () => {
    const noTable = {
      ...ticket,
      order: { ...ticket.order!, table: null, tableId: null },
    };
    expect(
      header({
        ...noTable,
        order: { ...noTable.order!, type: "TAKEAWAY" },
      }),
    ).toContain("Pickup order");
    expect(
      header({
        ...noTable,
        order: { ...noTable.order!, type: "DELIVERY" as never },
      }),
    ).toContain("delivery");

    const course = {
      courseNumber: 2,
      name: "Mains",
    } as NonNullable<KitchenTicket["course"]>;
    expect(header({ ...ticket, course, courseId: "course-2" })).toContain(
      "Course 2 · Mains",
    );
    expect(
      header({
        ...ticket,
        course: { ...course, name: null },
        courseId: "course-2",
      }),
    ).toContain("Course 2");
    expect(header({ ...ticket, ticketNumber: 2 })).toContain("Round 2");
    expect(header({ ...ticket, status: "HELD", firedAt: null })).not.toContain(
      "0m",
    );

    const defaultFulfillment = {
      ...ticket,
      items: ticket.items.map(({ fulfillmentType: _ignored, ...item }) => item),
    } as KitchenTicket;
    expect(header(defaultFulfillment)).toContain("dine in");
  });

  it("renders every item status, modifier, weight, combo, note, and fulfillment branch", () => {
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
    const html = renderToStaticMarkup(<TicketItems notes={null} items={items} />);
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

  it("renders timer urgent and non-urgent states", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(
      renderToStaticMarkup(
        <Timer firedAt={new Date(now - 20 * 60_000).toISOString()} />,
      ),
    ).toContain("text-red-400");
    expect(
      renderToStaticMarkup(<Timer firedAt={new Date(now - 1_000).toISOString()} />),
    ).toContain("text-text-secondary");
    vi.restoreAllMocks();
  });
});
