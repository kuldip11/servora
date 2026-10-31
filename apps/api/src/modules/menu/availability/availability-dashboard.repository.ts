import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  holidays,
  menuItemBranchOverrides,
  menuItemChannelOverrides,
  menuItems,
  menuItemSchedules,
} from "@/db/schema";

export const availabilityDashboardRepository = {
  async listDashboardItems(tenantId: string) {
    return db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        isNull(menuItems.deletedAt),
        eq(menuItems.isPublished, true),
      ),
      columns: {
        id: true,
        name: true,
        branchId: true,
        status: true,
        basePrice: true,
        taxRate: true,
        prepTimeMinutes: true,
        availabilityReason: true,
        manualOverrideStatus: true,
        manualOverrideReason: true,
        manualStockCount: true,
      },
      with: {
        variants: true,
        modifierGroupLinks: {
          with: { group: { with: { options: true } } },
        },
      },
      orderBy: (item, { asc }) => [asc(item.name)],
    });
  },

  async loadDashboardResolutionData(
    tenantId: string,
    itemIds: string[],
    branchIds: string[],
    holidayDate: string,
  ) {
    if (itemIds.length === 0) {
      return {
        schedules: [],
        branchOverrides: [],
        channelOverrides: [],
        holidays: [],
      };
    }

    const [schedules, branchOverrides, channelOverrides, holidayRows] =
      await Promise.all([
        db.query.menuItemSchedules.findMany({
          where: and(
            eq(menuItemSchedules.tenantId, tenantId),
            inArray(menuItemSchedules.menuItemId, itemIds),
            eq(menuItemSchedules.isActive, true),
            branchIds.length > 0
              ? or(
                  isNull(menuItemSchedules.branchId),
                  inArray(menuItemSchedules.branchId, branchIds),
                )
              : isNull(menuItemSchedules.branchId),
          ),
        }),
        branchIds.length > 0
          ? db.query.menuItemBranchOverrides.findMany({
              where: and(
                eq(menuItemBranchOverrides.tenantId, tenantId),
                inArray(menuItemBranchOverrides.menuItemId, itemIds),
                inArray(menuItemBranchOverrides.branchId, branchIds),
              ),
            })
          : Promise.resolve([]),
        db.query.menuItemChannelOverrides.findMany({
          where: and(
            eq(menuItemChannelOverrides.tenantId, tenantId),
            inArray(menuItemChannelOverrides.menuItemId, itemIds),
          ),
        }),
        db.query.holidays.findMany({
          where: and(
            eq(holidays.tenantId, tenantId),
            eq(holidays.holidayDate, holidayDate),
          ),
        }),
      ]);

    return {
      schedules,
      branchOverrides,
      channelOverrides,
      holidays: holidayRows,
    };
  },
};
