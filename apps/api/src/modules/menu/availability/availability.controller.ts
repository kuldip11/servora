import { InternalError } from "@/core/errors";
import type { AuthContext } from "@/core/auth";
import { successResponse, createdResponse } from "@/core/response";
import { requirePermission } from "@/core/auth";
import {
  availabilityService,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type UpsertOverrideInput,
  type ManualOverrideInput,
  type UpsertChannelOverrideInput,
} from "./availability.service";
import { writeAudit } from "@/core/audit";
import { menuChangeLog } from "@/modules/menu/change-log/menu-change-log";
import { branchRepository } from "@/modules/branches/branch.repository";
import {
  toAvailabilityBranchOverrideResponse,
  toAvailabilityDashboardResponse,
  toAvailabilityChannelOverrideResponse,
  toAvailabilityHolidayResponse,
  toAvailabilityItemStateResponse,
  toAvailabilityScheduleResponse,
  toAvailabilityStockCountResponse,
  toAvailabilityVariantOverrideResponse,
  toEffectiveAvailabilityItemResponse,
} from "./availability.mapper";

export const availabilityController = {
  async dashboard(
    auth: AuthContext,
    query: {
      channel?: "UNSCOPED" | "STAFF" | "CUSTOMER_QR";
      fulfillmentType?:
        "UNSCOPED" | "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
      cause?: string;
    },
  ) {
    requirePermission(auth, "menu:read");
    const branches = auth.branchId
      ? [
          (await branchRepository.findById(auth.tenantId, auth.branchId)) ?? {
            id: auth.branchId,
            name: "Current branch",
          },
        ]
      : await branchRepository.findMany(
          auth.tenantId,
          undefined,
          auth.tenantWide ? undefined : auth.authorizedBranchIds,
        );
    const dashboard = await availabilityService.getUnavailableDashboard(
      auth.tenantId,
      branches.map((branch) => branch.id),
      query,
      new Date(),
    );
    const branchNames = new Map(
      branches.map((branch) => [branch.id, branch.name] as const),
    );
    return successResponse(
      toAvailabilityDashboardResponse({
        ...dashboard,
        rows: dashboard.rows.map((row) => {
          const branchId = typeof row.branchId === "string" ? row.branchId : "";
          return { ...row, branchName: branchNames.get(branchId) ?? branchId };
        }),
      }),
    );
  },
  async setStockCount(
    auth: AuthContext,
    itemId: string,
    input: { count: number | null; variantId?: string | null },
  ) {
    requirePermission(auth, "menu:update");
    const result = await availabilityService.setManualStockCount(
      auth.tenantId,
      auth.branchId,
      itemId,
      input.count,
      input.variantId,
    );
    await menuChangeLog.record(
      auth,
      "AVAILABILITY",
      input.variantId ?? itemId,
      "UPDATED",
      {
        kind: "MANUAL_STOCK_COUNT",
        itemId,
        variantId: input.variantId ?? null,
        count: input.count,
      },
    );
    await writeAudit({
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      userId: auth.userId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "MENU_STOCK_COUNT_ADJUSTED",
      entity: input.variantId ? "menu_item_variant" : "menu_item",
      entityId: input.variantId ?? itemId,
      metadata: { itemId, count: input.count },
    });
    return successResponse(toAvailabilityStockCountResponse(result));
  },
  async setVariantOverride(
    auth: AuthContext,
    variantId: string,
    input: {
      status:
        | "ACTIVE"
        | "OUT_OF_STOCK"
        | "HIDDEN"
        | "SEASONAL"
        | "DISCONTINUED"
        | null;
      reason?: string | null;
    },
  ) {
    return successResponse(
      toAvailabilityVariantOverrideResponse(
        await availabilityService.setVariantOverride(
          auth.tenantId,
          variantId,
          input.status,
          input.reason ?? null,
        ),
      ),
    );
  },
  async listSchedules(auth: AuthContext, itemId: string) {
    const schedules = await availabilityService.listSchedulesForItem(
      auth.tenantId,
      itemId,
    );
    return successResponse(schedules.map(toAvailabilityScheduleResponse));
  },

  async createSchedule(
    auth: AuthContext,
    itemId: string,
    input: CreateScheduleInput,
  ) {
    const schedule = await availabilityService.createSchedule(
      auth.tenantId,
      itemId,
      input,
    );
    await menuChangeLog.record(
      auth,
      "AVAILABILITY",
      schedule.id,
      "CREATED",
      input,
    );
    return createdResponse(toAvailabilityScheduleResponse(schedule));
  },

  async updateSchedule(
    auth: AuthContext,
    scheduleId: string,
    input: UpdateScheduleInput,
  ) {
    const schedule = await availabilityService.updateSchedule(
      auth.tenantId,
      scheduleId,
      input,
    );
    await menuChangeLog.record(
      auth,
      "AVAILABILITY",
      scheduleId,
      "UPDATED",
      input,
    );
    return successResponse(toAvailabilityScheduleResponse(schedule));
  },

  async deleteSchedule(auth: AuthContext, scheduleId: string) {
    await availabilityService.deleteSchedule(auth.tenantId, scheduleId);
    await menuChangeLog.record(auth, "AVAILABILITY", scheduleId, "DELETED", {
      kind: "SCHEDULE",
    });
    return successResponse(null);
  },

  async getCurrentStatus(
    auth: AuthContext,
    itemId: string,
    timestamp: string | undefined,
  ) {
    const branchId = auth.branchId ?? undefined;
    const at = timestamp ? new Date(timestamp) : new Date();
    const result = await availabilityService.getEffectiveStatus(
      auth.tenantId,
      itemId,
      branchId,
      { channel: "UNSCOPED", fulfillmentType: "UNSCOPED", asOf: at },
    );
    return successResponse(result);
  },

  async listHolidays(
    auth: AuthContext,
    year: string | undefined,
    region: string | undefined,
  ) {
    const holidays = await availabilityService.listHolidays(
      auth.tenantId,
      year ? parseInt(year, 10) : undefined,
      region,
    );
    return successResponse(holidays.map(toAvailabilityHolidayResponse));
  },

  async createHoliday(
    auth: AuthContext,
    data: { name: string; holidayDate: string; region?: string | undefined },
  ) {
    const holiday = await availabilityService.createHoliday(
      auth.tenantId,
      data,
    );
    if (!holiday) throw new InternalError("Holiday could not be created");
    await menuChangeLog.record(auth, "AVAILABILITY", holiday.id, "CREATED", {
      kind: "HOLIDAY",
      ...data,
    });
    return successResponse(toAvailabilityHolidayResponse(holiday));
  },

  async updateHoliday(
    auth: AuthContext,
    holidayId: string,
    data: {
      name?: string | undefined;
      holidayDate?: string | undefined;
      region?: string | null | undefined;
    },
  ) {
    const holiday = await availabilityService.updateHoliday(
      auth.tenantId,
      holidayId,
      data,
    );
    await menuChangeLog.record(auth, "AVAILABILITY", holidayId, "UPDATED", {
      kind: "HOLIDAY",
      ...data,
    });
    return successResponse(toAvailabilityHolidayResponse(holiday));
  },

  async deleteHoliday(auth: AuthContext, holidayId: string) {
    await availabilityService.deleteHoliday(auth.tenantId, holidayId);
    await menuChangeLog.record(auth, "AVAILABILITY", holidayId, "DELETED", {
      kind: "HOLIDAY",
    });
    return successResponse(null);
  },

  async getEffectiveItem(auth: AuthContext, itemId: string, branchId: string) {
    const asOf = new Date();
    const result = await availabilityService.getEffectiveItem(
      auth.tenantId,
      itemId,
      branchId,
      { channel: "UNSCOPED", fulfillmentType: "UNSCOPED", asOf },
    );
    return successResponse(toEffectiveAvailabilityItemResponse(result));
  },

  async setManualOverride(
    auth: AuthContext,
    itemId: string,
    input: ManualOverrideInput,
  ) {
    const item = await availabilityService.setManualOverride(
      auth.tenantId,
      itemId,
      input,
      auth.userId,
    );
    await menuChangeLog.record(auth, "AVAILABILITY", itemId, "UPDATED", {
      kind: "MANUAL_OVERRIDE",
      status: input.status,
      reason: input.reason.trim(),
    });
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "MENU_AVAILABILITY_OVERRIDE_SET",
      entity: "menu_item",
      entityId: itemId,
      metadata: { status: input.status, reason: input.reason.trim() },
    });
    return successResponse(toAvailabilityItemStateResponse(item));
  },

  async clearManualOverride(auth: AuthContext, itemId: string) {
    const item = await availabilityService.clearManualOverride(
      auth.tenantId,
      itemId,
    );
    await menuChangeLog.record(auth, "AVAILABILITY", itemId, "UPDATED", {
      kind: "MANUAL_OVERRIDE_CLEARED",
    });
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "MENU_AVAILABILITY_OVERRIDE_CLEARED",
      entity: "menu_item",
      entityId: itemId,
    });
    return successResponse(toAvailabilityItemStateResponse(item));
  },

  async upsertOverride(
    auth: AuthContext,
    itemId: string,
    branchId: string,
    input: UpsertOverrideInput,
  ) {
    const override = await availabilityService.upsertOverride(
      auth.tenantId,
      itemId,
      branchId,
      input,
    );
    await menuChangeLog.record(auth, "AVAILABILITY", itemId, "UPDATED", {
      kind: "BRANCH_OVERRIDE",
      branchId,
      ...input,
    });
    return successResponse(toAvailabilityBranchOverrideResponse(override));
  },

  async deleteOverride(auth: AuthContext, itemId: string, branchId: string) {
    await availabilityService.deleteOverride(auth.tenantId, itemId, branchId);
    await menuChangeLog.record(auth, "AVAILABILITY", itemId, "DELETED", {
      kind: "BRANCH_OVERRIDE",
      branchId,
    });
    return successResponse(null);
  },

  async listOverridesForItem(auth: AuthContext, itemId: string) {
    const overrides = await availabilityService.listOverridesForItem(
      auth.tenantId,
      itemId,
    );
    return successResponse(overrides.map(toAvailabilityBranchOverrideResponse));
  },
  async listChannelOverrides(auth: AuthContext, itemId: string) {
    return successResponse(
      (
        await availabilityService.listChannelOverrides(auth.tenantId, itemId)
      ).map(toAvailabilityChannelOverrideResponse),
    );
  },
  async upsertChannelOverride(
    auth: AuthContext,
    itemId: string,
    input: UpsertChannelOverrideInput,
  ) {
    return successResponse(
      toAvailabilityChannelOverrideResponse(
        await availabilityService.upsertChannelOverride(
          auth.tenantId,
          itemId,
          input,
        ),
      ),
    );
  },
  async deleteChannelOverride(auth: AuthContext, id: string) {
    await availabilityService.deleteChannelOverride(auth.tenantId, id);
    return successResponse(null);
  },
};
