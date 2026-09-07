import { describe, expect, it, vi } from "vitest";
import {
  highestPriorityActiveSchedule,
  scheduleDate,
  scheduleMatches,
} from "../schedule-precedence";
const d = new Date(2026, 8, 6, 23, 30, 0); // Sunday
const base = (o: any = {}) => ({
  scheduleType: "DAILY",
  startTime: "22:00:00",
  endTime: "02:00:00",
  dayOfWeek: null,
  startDate: null,
  endDate: null,
  holidayName: null,
  isActive: true,
  ...o,
});
describe("schedule precedence comprehensive coverage", () => {
  it("formats dates", () =>
    expect(scheduleDate(new Date(2026, 0, 2))).toBe("2026-01-02"));
  it("matches every schedule type and inactive/invalid windows", async () => {
    const h = vi.fn().mockResolvedValue(true);
    await expect(
      scheduleMatches(base({ isActive: false }), d, h),
    ).resolves.toBe(false);
    await expect(scheduleMatches(base(), d, h)).resolves.toBe(true);
    await expect(
      scheduleMatches(base(), new Date(2026, 8, 7, 1, 0, 0), h),
    ).resolves.toBe(true);
    await expect(
      scheduleMatches(base({ startTime: null }), d, h),
    ).resolves.toBe(false);
    await expect(
      scheduleMatches(
        base({ startTime: "23:00:00", endTime: "23:59:59" }),
        d,
        h,
      ),
    ).resolves.toBe(true);
    await expect(
      scheduleMatches(
        base({ startTime: "10:00:00", endTime: "12:00:00" }),
        d,
        h,
      ),
    ).resolves.toBe(false);
    await expect(
      scheduleMatches(
        base({ scheduleType: "WEEKLY", dayOfWeek: d.getDay() }),
        d,
        h,
      ),
    ).resolves.toBe(true);
    await expect(
      scheduleMatches(base({ scheduleType: "WEEKLY", dayOfWeek: 1 }), d, h),
    ).resolves.toBe(false);
    await expect(
      scheduleMatches(
        base({
          scheduleType: "SPECIFIC_DATE",
          startTime: null,
          endTime: null,
          startDate: null,
        }),
        d,
        h,
      ),
    ).resolves.toBe(false);
    const today = scheduleDate(d);
    await expect(
      scheduleMatches(
        base({
          scheduleType: "SPECIFIC_DATE",
          startTime: null,
          endTime: null,
          startDate: today,
          endDate: null,
        }),
        d,
        h,
      ),
    ).resolves.toBe(true);
    await expect(
      scheduleMatches(
        base({
          scheduleType: "SPECIFIC_DATE",
          startTime: null,
          endTime: null,
          startDate: "2026-09-01",
          endDate: "2026-09-05",
        }),
        d,
        h,
      ),
    ).resolves.toBe(false);
    await expect(
      scheduleMatches(
        base({
          scheduleType: "HOLIDAY",
          startTime: null,
          endTime: null,
          holidayName: "Fest",
        }),
        d,
        h,
      ),
    ).resolves.toBe(true);
    await expect(
      scheduleMatches(
        base({
          scheduleType: "HOLIDAY",
          startTime: null,
          endTime: null,
          holidayName: null,
        }),
        d,
        h,
      ),
    ).resolves.toBe(false);
  });
  it("selects highest active priority and handles none", async () => {
    const h = vi.fn().mockResolvedValue(true);
    const daily = base();
    const weekly = base({ scheduleType: "WEEKLY", dayOfWeek: d.getDay() });
    const holiday = base({
      scheduleType: "HOLIDAY",
      startTime: null,
      endTime: null,
      holidayName: "Fest",
    });
    await expect(
      highestPriorityActiveSchedule([daily, weekly, holiday], d, h),
    ).resolves.toBe(holiday);
    await expect(
      highestPriorityActiveSchedule([base({ isActive: false })], d, h),
    ).resolves.toBeNull();
  });
});
