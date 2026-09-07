import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TicketGroup } from "@/features/orders/components/TicketGroup";
import { readyTicket } from "./fixtures";

describe("TicketGroup", () => {
  it("shows served action only when provided", () => {
    expect(
      renderToStaticMarkup(
        <TicketGroup
          ticket={readyTicket}
          onMarkServed={vi.fn()}
          isUpdating={false}
        />,
      ),
    ).toContain("Mark Round Served");
    expect(
      renderToStaticMarkup(
        <TicketGroup ticket={readyTicket} isUpdating={false} />,
      ),
    ).not.toContain("Mark Round Served");
  });
});
