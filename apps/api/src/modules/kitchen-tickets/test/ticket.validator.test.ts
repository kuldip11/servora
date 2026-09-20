import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  updateTicketStatusBody,
  ticketIdParams,
} from "@/modules/kitchen-tickets/ticket.validator";

describe("kitchen ticket validators", () => {
  it("accepts supported statuses and rejects unknown values", () => {
    expect(Value.Check(updateTicketStatusBody, { status: "READY" })).toBe(true);
    expect(Value.Check(updateTicketStatusBody, { status: "COOKING" })).toBe(
      false,
    );
    expect(Value.Check(updateTicketStatusBody, {})).toBe(false);
  });
  it("requires a ticket id parameter", () => {
    expect(
      Value.Check(ticketIdParams, {
        id: "00000000-0000-4000-8000-000000000001",
      }),
    ).toBe(true);
    expect(Value.Check(ticketIdParams, {})).toBe(false);
  });
});
