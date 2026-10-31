import type { MenuItemScheduleType, MenuItemStatus } from "@pos/types";
import {
  invalidScheduleFields,
  itemNotFound,
  scheduleNotFound,
} from "./availability.errors";
import { availabilityRepository } from "./availability.repository";
import type { AvailabilityContext } from "./availability.types";
import {
  highestPriorityActiveSchedule,
  scheduleMatches,
} from "./schedule-precedence";

type ScheduleRow = Awaited<
  ReturnType<typeof availabilityRepository.findActiveSchedulesForItem>
>[number];

export interface CreateScheduleInput {
  scheduleType: MenuItemScheduleType;
  startTime?: string | undefined;
  endTime?: string | undefined;
  dayOfWeek?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  holidayName?: string | undefined;
  statusDuringPeriod?: MenuItemStatus | undefined;
  branchId?: string | undefined;
}

export interface UpdateScheduleInput {
  startTime?: string | undefined;
  endTime?: string | undefined;
  dayOfWeek?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  holidayName?: string | undefined;
  statusDuringPeriod?: MenuItemStatus | undefined;
  branchId?: string | null | undefined;
  isActive?: boolean | undefined;
}

const describeSchedule = (schedule: ScheduleRow): string => {
  switch (schedule.scheduleType) {
    case "DAILY":
      return `Daily window ${schedule.startTime}–${schedule.endTime}`;
    case "WEEKLY": {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return `${days[schedule.dayOfWeek ?? 0]} ${schedule.startTime}–${schedule.endTime}`;
    }
    case "SPECIFIC_DATE":
      return `Scheduled ${schedule.startDate}${schedule.endDate && schedule.endDate !== schedule.startDate ? ` – ${schedule.endDate}` : ""}`;
    case "HOLIDAY":
      return `Holiday: ${schedule.holidayName}`;
    default:
      return "Scheduled";
  }
};

export const availabilityScheduleService = {
  async listSchedulesForItem(tenantId: string, itemId: string) {
    return availabilityRepository.listSchedulesForItem(tenantId, itemId);
  },

  async createSchedule(
    tenantId: string,
    itemId: string,
    input: CreateScheduleInput,
  ) {
    const item = await availabilityRepository.findItemBasics(tenantId, itemId);
    if (!item) throw itemNotFound(itemId);

    if (
      input.scheduleType === "DAILY" &&
      (!input.startTime || !input.endTime)
    ) {
      throw invalidScheduleFields("DAILY schedules need startTime and endTime");
    }
    if (
      input.scheduleType === "WEEKLY" &&
      (input.dayOfWeek == null || !input.startTime || !input.endTime)
    ) {
      throw invalidScheduleFields(
        "WEEKLY schedules need dayOfWeek, startTime and endTime",
      );
    }
    if (input.scheduleType === "SPECIFIC_DATE" && !input.startDate) {
      throw invalidScheduleFields(
        "SPECIFIC_DATE schedules need at least a startDate",
      );
    }
    if (input.scheduleType === "HOLIDAY" && !input.holidayName) {
      throw invalidScheduleFields("HOLIDAY schedules need a holidayName");
    }

    return availabilityRepository.createSchedule({
      tenantId,
      menuItemId: itemId,
      ...input,
    });
  },

  async updateSchedule(
    tenantId: string,
    scheduleId: string,
    input: UpdateScheduleInput,
  ) {
    const updated = await availabilityRepository.updateSchedule(
      tenantId,
      scheduleId,
      input,
    );
    if (!updated) throw scheduleNotFound(scheduleId);
    return updated;
  },

  async deleteSchedule(tenantId: string, scheduleId: string): Promise<void> {
    await availabilityRepository.deleteSchedule(tenantId, scheduleId);
  },

  async listHolidays(
    tenantId: string,
    year?: number | undefined,
    region?: string | undefined,
  ) {
    return availabilityRepository.listHolidays(tenantId, year, region);
  },

  async createHoliday(
    tenantId: string,
    data: { name: string; holidayDate: string; region?: string | undefined },
  ) {
    return availabilityRepository.createHoliday(tenantId, data);
  },

  async updateHoliday(
    tenantId: string,
    holidayId: string,
    data: {
      name?: string | undefined;
      holidayDate?: string | undefined;
      region?: string | null | undefined;
    },
  ) {
    return availabilityRepository.updateHoliday(tenantId, holidayId, data);
  },

  async deleteHoliday(tenantId: string, holidayId: string): Promise<void> {
    await availabilityRepository.deleteHoliday(tenantId, holidayId);
  },

  async isScheduleActive(
    tenantId: string,
    schedule: ScheduleRow,
    now: Date,
  ): Promise<boolean> {
    return scheduleMatches(
      schedule,
      now,
      async (name, date) =>
        !!(await availabilityRepository.findHoliday(tenantId, name, date)),
    );
  },

  async getEffectiveStatus(
    tenantId: string,
    itemId: string,
    branchId: string | undefined,
    context: AvailabilityContext,
  ): Promise<{ status: MenuItemStatus; reason: string }> {
    const item = await availabilityRepository.findItemBasics(tenantId, itemId);
    if (!item) throw itemNotFound(itemId);

    if (item.manualOverrideStatus) {
      return {
        status: item.manualOverrideStatus,
        reason: item.manualOverrideReason ?? "Manual availability override",
      };
    }

    if (item.manualStockCount !== null && item.manualStockCount <= 0) {
      return { status: "OUT_OF_STOCK", reason: "Manual stock count depleted" };
    }

    const schedules = await availabilityRepository.findActiveSchedulesForItem(
      tenantId,
      itemId,
      branchId,
    );

    const best = await highestPriorityActiveSchedule(
      schedules,
      context.asOf,
      async (name, date) =>
        !!(await availabilityRepository.findHoliday(tenantId, name, date)),
    );

    if (best) {
      return {
        status: best.statusDuringPeriod,
        reason: describeSchedule(best),
      };
    }
    return {
      status: item.status,
      reason:
        item.availabilityReason ?? "No active schedule — using base status",
    };
  },
};
