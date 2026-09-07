import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { KitchenTicket } from "@pos/types";
import { TicketHeader } from "../TicketHeader";
import { ticket } from "../../test/fixtures";

vi.mock("@pos/ui", () => ({
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

const renderHeader = (value: KitchenTicket) =>
  renderToStaticMarkup(
    <TicketHeader
      ticket={value}
      statusLabel="Status"
      statusTone="info"
      statusTextClass="status-class"
    />,
  );

describe("TicketHeader", () => {
  it("renders table and status", () => {
    const html = renderToStaticMarkup(
      <TicketHeader
        ticket={ticket}
        statusLabel="Waiting"
        statusTone="info"
        statusTextClass=""
      />,
    );
    expect(html).toContain("Table 12");
    expect(html).toContain("Waiting");
  });

  it("tells the kitchen to deliver a table takeaway round back to the table", () => {
    const takeawayTicket = {
      ...ticket,
      items: ticket.items.map((item) => ({
        ...item,
        fulfillmentType: "TAKEAWAY" as const,
      })),
    };
    const html = renderToStaticMarkup(
      <TicketHeader
        ticket={takeawayTicket}
        statusLabel="Waiting"
        statusTone="info"
        statusTextClass=""
      />,
    );
    expect(html).toContain("Table 12");
    expect(html).toContain("Takeaway · pack and deliver to table");
  });

  it("renders fulfillment, course, round, and held header branches", () => {
    const noTable = {
      ...ticket,
      order: { ...ticket.order!, table: null, tableId: null },
    };
    expect(
      renderHeader({
        ...noTable,
        order: { ...noTable.order!, type: "TAKEAWAY" },
      }),
    ).toContain("Pickup order");
    expect(
      renderHeader({
        ...noTable,
        order: { ...noTable.order!, type: "DELIVERY" as never },
      }),
    ).toContain("delivery");

    const course = { courseNumber: 2, name: "Mains" } as NonNullable<
      KitchenTicket["course"]
    >;
    expect(renderHeader({ ...ticket, course, courseId: "course-2" })).toContain(
      "Course 2 · Mains",
    );
    expect(
      renderHeader({
        ...ticket,
        course: { ...course, name: null },
        courseId: "course-2",
      }),
    ).toContain("Course 2");
    expect(renderHeader({ ...ticket, ticketNumber: 2 })).toContain("Round 2");
    expect(
      renderHeader({ ...ticket, status: "HELD", firedAt: null }),
    ).not.toContain("0m");

    const defaultFulfillment = {
      ...ticket,
      items: ticket.items.map(({ fulfillmentType: _ignored, ...item }) => item),
    } as KitchenTicket;
    expect(renderHeader(defaultFulfillment)).toContain("dine in");
  });
});
