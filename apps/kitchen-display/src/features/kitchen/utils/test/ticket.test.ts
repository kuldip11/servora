import { describe, expect, it, vi } from "vitest";
import {
  calculateElapsedMs,
  formatTicketAge,
  groupTicketsByStatus,
  isUrgent,
  filterTicketForStation,
  voidUrgency,
} from "@/features/kitchen/utils/ticket";
import { URGENT_THRESHOLD_MS } from "@/features/kitchen/constants";
import { ticket } from "@/features/kitchen/test/fixtures";
describe("ticket utils", () => {
  it("calculates age and urgency", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(calculateElapsedMs(new Date(now - 1000).toISOString())).toBe(1000);
    expect(
      isUrgent(new Date(now - URGENT_THRESHOLD_MS - 1).toISOString()),
    ).toBe(true);
    expect(calculateElapsedMs(null)).toBe(0);
    expect(isUrgent(null)).toBe(false);
    vi.restoreAllMocks();
  });
  it("formats and groups tickets", () => {
    expect(formatTicketAge(ticket.firedAt)).toContain("minute");
    expect(formatTicketAge(null)).toBe("Held");
    expect(
      groupTicketsByStatus(
        [ticket, { ...ticket, id: "2", status: "READY" }],
        "FIRED",
      ),
    ).toHaveLength(1);
    expect(groupTicketsByStatus(undefined, "READY")).toEqual([]);
  });
  it("projects station lines while retaining unassigned fallback lines", () => {
    const multi = {
      ...ticket,
      items: [
        { ...ticket.items[0]!, id: "grill", stationId: "grill" },
        { ...ticket.items[0]!, id: "bar", stationId: "bar" },
        { ...ticket.items[0]!, id: "fallback", stationId: null },
      ],
    };
    expect(
      filterTicketForStation(multi, "grill")?.items.map((item) => item.id),
    ).toEqual(["grill", "fallback"]);
    expect(
      filterTicketForStation(multi, "dessert")?.items.map((item) => item.id),
    ).toEqual(["fallback"]);
    expect(filterTicketForStation(multi)).toEqual(multi);
    expect(
      filterTicketForStation(
        {
          ...ticket,
          items: [
            { ...ticket.items[0]!, menuItemId: null, stationId: "grill" },
          ],
        },
        "grill",
      ),
    ).toBeNull();
  });

  it("classifies in-progress voids as urgent", () => {
    const voided = {
      ...ticket,
      status: "PREPARING" as const,
      items: [{ ...ticket.items[0]!, itemStatus: "VOIDED" as const }],
    };
    expect(voidUrgency(ticket)).toBe("none");
    expect(voidUrgency(voided)).toBe("danger");
    expect(voidUrgency({ ...voided, status: "FIRED" })).toBe("warning");
  });
});
