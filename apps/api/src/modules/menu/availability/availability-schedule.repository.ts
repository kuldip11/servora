import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import type { MenuItemScheduleType, MenuItemStatus } from "@pos/types";
import { db } from "@/db";
import { holidays, menuItemSchedules } from "@/db/schema";
import { compact } from "@/lib/object-utils";

export const availabilityScheduleRepository = {
  async listSchedulesForItem(tenantId: string, itemId: string) {
    return db.query.menuItemSchedules.findMany({
      where: and(
        eq(menuItemSchedules.tenantId, tenantId),
        eq(menuItemSchedules.menuItemId, itemId),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  },

  async findActiveSchedulesForItem(
    tenantId: string,
    itemId: string,
    branchId?: string | undefined,
  ) {
    return db.query.menuItemSchedules.findMany({
      where: and(
        eq(menuItemSchedules.tenantId, tenantId),
        eq(menuItemSchedules.menuItemId, itemId),
        eq(menuItemSchedules.isActive, true),
        branchId
          ? or(
              isNull(menuItemSchedules.branchId),
              eq(menuItemSchedules.branchId, branchId),
            )
          : undefined,
      ),
    });
  },

  async createSchedule(data: {
    tenantId: string;
    menuItemId: string;
    branchId?: string | undefined;
    scheduleType: MenuItemScheduleType;
    startTime?: string | undefined;
    endTime?: string | undefined;
    dayOfWeek?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    holidayName?: string | undefined;
    statusDuringPeriod?: MenuItemStatus | undefined;
  }) {
    const [row] = await db
      .insert(menuItemSchedules)
      .values({
        tenantId: data.tenantId,
        menuItemId: data.menuItemId,
        branchId: data.branchId ?? null,
        scheduleType: data.scheduleType,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        dayOfWeek: data.dayOfWeek ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? data.startDate ?? null,
        holidayName: data.holidayName ?? null,
        statusDuringPeriod: data.statusDuringPeriod ?? "ACTIVE",
      })
      .returning();
    return row!;
  },

  async updateSchedule(
    tenantId: string,
    scheduleId: string,
    data: {
      startTime?: string | undefined;
      endTime?: string | undefined;
      dayOfWeek?: number | undefined;
      startDate?: string | undefined;
      endDate?: string | undefined;
      holidayName?: string | undefined;
      statusDuringPeriod?: MenuItemStatus | undefined;
      branchId?: string | null | undefined;
      isActive?: boolean | undefined;
    },
  ) {
    const [row] = await db
      .update(menuItemSchedules)
      .set(compact({ ...data, updatedAt: new Date() }))
      .where(
        and(
          eq(menuItemSchedules.id, scheduleId),
          eq(menuItemSchedules.tenantId, tenantId),
        ),
      )
      .returning();
    return row;
  },

  async deleteSchedule(tenantId: string, scheduleId: string) {
    await db
      .delete(menuItemSchedules)
      .where(
        and(
          eq(menuItemSchedules.id, scheduleId),
          eq(menuItemSchedules.tenantId, tenantId),
        ),
      );
  },

  async listHolidays(
    tenantId: string,
    year?: number | undefined,
    region?: string | undefined,
  ) {
    return db.query.holidays.findMany({
      where: and(
        eq(holidays.tenantId, tenantId),
        region ? eq(holidays.region, region) : undefined,
        year ? gte(holidays.holidayDate, `${year}-01-01`) : undefined,
        year ? lte(holidays.holidayDate, `${year}-12-31`) : undefined,
      ),
      orderBy: (t, { asc }) => [asc(t.holidayDate)],
    });
  },

  async findHoliday(tenantId: string, name: string, date: string) {
    return db.query.holidays.findFirst({
      where: and(
        eq(holidays.tenantId, tenantId),
        eq(holidays.name, name),
        eq(holidays.holidayDate, date),
      ),
    });
  },

  async createHoliday(
    tenantId: string,
    data: { name: string; holidayDate: string; region?: string | undefined },
  ) {
    const [row] = await db
      .insert(holidays)
      .values(compact({ tenantId, ...data }) as typeof holidays.$inferInsert)
      .returning();
    return row;
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
    const [row] = await db
      .update(holidays)
      .set(compact(data))
      .where(and(eq(holidays.id, holidayId), eq(holidays.tenantId, tenantId)))
      .returning();
    return row;
  },

  async deleteHoliday(tenantId: string, holidayId: string) {
    await db
      .delete(holidays)
      .where(and(eq(holidays.id, holidayId), eq(holidays.tenantId, tenantId)));
  },
};
