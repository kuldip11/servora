import { describe, expect, it } from "vitest";
import {
  mergeRealtimeTicket,
  shouldApplyRealtime,
} from "@/features/orders/utils/realtime";

describe("waiter realtime stale-event protection", () => {
  it("accepts newer/equal events and rejects older events", () => {
    const current = { updatedAt: "2026-08-27T12:00:00.000Z" };
    expect(
      shouldApplyRealtime(current, { updatedAt: "2026-08-27T13:00:00.000Z" }),
    ).toBe(true);
    expect(shouldApplyRealtime(current, current)).toBe(true);
    expect(
      shouldApplyRealtime(current, { updatedAt: "2026-08-27T11:00:00.000Z" }),
    ).toBe(false);
  });

  it("does not roll a ready ticket back to preparing", () => {
    const current = [
      {
        id: "t1",
        status: "READY" as const,
        notes: null,
        courseId: null,
        course: null,
        firedAt: "2026-08-27T10:00:00.000Z",
        readyAt: "2026-08-27T12:00:00.000Z",
        servedAt: null,
        updatedAt: "2026-08-27T12:00:00.000Z",
      },
    ];
    const stale = {
      id: "t1",
      status: "PREPARING" as const,
      notes: null,
      courseId: null,
      course: null,
      firedAt: "2026-08-27T10:00:00.000Z",
      readyAt: null,
      servedAt: null,
      updatedAt: "2026-08-27T11:00:00.000Z",
    };
    expect(mergeRealtimeTicket(current, stale)).toEqual(current);
  });

  it("updates realtime status fields without replacing the detailed ticket", () => {
    const current = [
      {
        id: "t1",
        status: "FIRED" as const,
        notes: "Original",
        courseId: null,
        course: null,
        firedAt: "2026-08-27T10:00:00.000Z",
        readyAt: null,
        servedAt: null,
        updatedAt: "2026-08-27T10:00:00.000Z",
        items: [{ id: "detailed-item", manualPrice: 12 }],
      },
    ];
    const incoming = {
      id: "t1",
      status: "PREPARING" as const,
      notes: "Updated",
      courseId: null,
      course: null,
      firedAt: "2026-08-27T10:00:00.000Z",
      readyAt: null,
      servedAt: null,
      updatedAt: "2026-08-27T11:00:00.000Z",
    };

    expect(mergeRealtimeTicket(current, incoming)).toEqual([
      expect.objectContaining({
        status: "PREPARING",
        notes: "Updated",
        items: current[0]?.items,
      }),
    ]);
  });
});
