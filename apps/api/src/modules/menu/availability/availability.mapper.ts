import { InternalError } from "@/core/errors";
import type {
  AvailabilityBranchOverrideResponse,
  AvailabilityDashboardResponse,
  AvailabilityChannelOverrideResponse,
  AvailabilityHolidayResponse,
  AvailabilityItemStateResponse,
  AvailabilityScheduleResponse,
  AvailabilityStockCountResponse,
  AvailabilityVariantOverrideResponse,
  EffectiveAvailabilityItemResponse,
} from "@pos/contracts";
import {
  holidays,
  menuItemBranchOverrides,
  menuItemChannelOverrides,
  menuItemSchedules,
  menuItems,
  menuItemVariants,
} from "@/db/schema";

const decimal = (value: string | number): number => Number(value);
const iso = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const requiredString = (value: unknown, field: string): string => {
  if (typeof value === "string") return value;
  throw new InternalError(
    `Availability dashboard response is missing ${field}`,
  );
};
const availabilityStatus = (
  value: unknown,
): AvailabilityDashboardResponse["rows"][number]["status"] => {
  if (
    value === "ACTIVE" ||
    value === "OUT_OF_STOCK" ||
    value === "HIDDEN" ||
    value === "SEASONAL" ||
    value === "DISCONTINUED"
  )
    return value;
  throw new InternalError(
    "Availability dashboard response contains an invalid status",
  );
};
const dashboardEntityType = (
  value: unknown,
): AvailabilityDashboardResponse["rows"][number]["entityType"] => {
  if (value === "ITEM" || value === "VARIANT" || value === "MODIFIER_OPTION")
    return value;
  throw new InternalError(
    "Availability dashboard response contains an invalid entity type",
  );
};
const dashboardChannel = (
  value: unknown,
): AvailabilityDashboardResponse["rows"][number]["channel"] => {
  if (value === "STAFF" || value === "CUSTOMER_QR") return value;
  throw new InternalError(
    "Availability dashboard response contains an invalid channel",
  );
};
const dashboardFulfillment = (
  value: unknown,
): AvailabilityDashboardResponse["rows"][number]["fulfillmentType"] => {
  if (
    value === "DINE_IN" ||
    value === "TAKEAWAY" ||
    value === "DELIVERY" ||
    value === "ONLINE"
  )
    return value;
  throw new InternalError(
    "Availability dashboard response contains an invalid fulfillment type",
  );
};

export const toAvailabilityDashboardResponse = (value: {
  asOf: string;
  branches: string[];
  channels: string[];
  fulfillmentTypes: string[];
  rows: Array<Record<string, unknown> & { branchName?: string }>;
}): AvailabilityDashboardResponse => ({
  asOf: value.asOf,
  branches: value.branches,
  channels: value.channels.map(dashboardChannel),
  fulfillmentTypes: value.fulfillmentTypes.map(dashboardFulfillment),
  rows: value.rows.map((row) => ({
    entityType: dashboardEntityType(row.entityType),
    entityId: requiredString(row.entityId, "entityId"),
    menuItemId: requiredString(row.menuItemId, "menuItemId"),
    name: requiredString(row.name, "name"),
    status: availabilityStatus(row.status),
    reason: requiredString(row.reason, "reason"),
    cause: requiredString(row.cause, "cause"),
    branchId: requiredString(row.branchId, "branchId"),
    branchName: requiredString(row.branchName, "branchName"),
    channel: dashboardChannel(row.channel),
    fulfillmentType: dashboardFulfillment(row.fulfillmentType),
  })),
});

export const toAvailabilityScheduleResponse = (
  row: typeof menuItemSchedules.$inferSelect,
): AvailabilityScheduleResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  menuItemId: row.menuItemId,
  branchId: row.branchId,
  scheduleType: row.scheduleType,
  startTime: row.startTime,
  endTime: row.endTime,
  dayOfWeek: row.dayOfWeek,
  startDate: row.startDate,
  endDate: row.endDate,
  holidayName: row.holidayName,
  statusDuringPeriod: row.statusDuringPeriod,
  isActive: row.isActive,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toAvailabilityHolidayResponse = (
  row: typeof holidays.$inferSelect | undefined,
): AvailabilityHolidayResponse => {
  if (!row)
    throw new InternalError(
      "Availability holiday response could not be loaded",
    );
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    holidayDate: row.holidayDate,
    region: row.region,
  };
};

export const toAvailabilityItemStateResponse = (
  row:
    | Pick<
        typeof menuItems.$inferSelect,
        | "id"
        | "tenantId"
        | "branchId"
        | "status"
        | "availabilityReason"
        | "manualOverrideStatus"
        | "manualOverrideReason"
        | "manualOverrideSetBy"
        | "manualOverrideSetAt"
        | "manualStockCount"
        | "manualStockCountUpdatedAt"
      >
    | undefined,
): AvailabilityItemStateResponse => {
  if (!row)
    throw new InternalError("Availability item response could not be loaded");
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    status: row.status,
    availabilityReason: row.availabilityReason,
    manualOverrideStatus: row.manualOverrideStatus,
    manualOverrideReason: row.manualOverrideReason,
    manualOverrideSetBy: row.manualOverrideSetBy,
    manualOverrideSetAt: iso(row.manualOverrideSetAt),
    manualStockCount: row.manualStockCount,
    manualStockCountUpdatedAt: iso(row.manualStockCountUpdatedAt),
  };
};

export const toAvailabilityBranchOverrideResponse = (
  row: typeof menuItemBranchOverrides.$inferSelect | undefined,
): AvailabilityBranchOverrideResponse => {
  if (!row)
    throw new InternalError(
      "Availability branch override response could not be loaded",
    );
  return {
    id: row.id,
    tenantId: row.tenantId,
    menuItemId: row.menuItemId,
    branchId: row.branchId,
    price: row.price === null ? null : decimal(row.price),
    taxRate: row.taxRate === null ? null : decimal(row.taxRate),
    prepTimeMinutes: row.prepTimeMinutes,
    status: row.status,
    isHidden: row.isHidden,
    availabilityReason: row.availabilityReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const asAvailabilityChannel = (
  value: string,
): AvailabilityChannelOverrideResponse["channel"] => {
  if (value === "STAFF" || value === "CUSTOMER_QR") return value;
  throw new InternalError(
    "Availability channel response contains an invalid channel",
  );
};
const asFulfillmentType = (
  value: string | null,
): AvailabilityChannelOverrideResponse["fulfillmentType"] => {
  if (
    value === null ||
    value === "DINE_IN" ||
    value === "TAKEAWAY" ||
    value === "DELIVERY" ||
    value === "ONLINE"
  )
    return value;
  throw new InternalError(
    "Availability channel response contains an invalid fulfillment type",
  );
};

export const toAvailabilityChannelOverrideResponse = (
  row: typeof menuItemChannelOverrides.$inferSelect,
): AvailabilityChannelOverrideResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  menuItemId: row.menuItemId,
  channel: asAvailabilityChannel(row.channel),
  fulfillmentType: asFulfillmentType(row.fulfillmentType),
  status: row.status,
  isHidden: row.isHidden,
  availabilityReason: row.availabilityReason,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toAvailabilityStockCountResponse = (
  row:
    | (typeof menuItems.$inferSelect & {
        menuItemId: string;
        entityType: "ITEM";
      })
    | (typeof menuItemVariants.$inferSelect & {
        menuItemId: string;
        entityType: "VARIANT";
      }),
): AvailabilityStockCountResponse => ({
  id: row.id,
  menuItemId: row.menuItemId,
  entityType: row.entityType,
  manualStockCount: row.manualStockCount,
  manualStockCountUpdatedAt: iso(row.manualStockCountUpdatedAt),
});

export const toAvailabilityVariantOverrideResponse = (
  row: typeof menuItemVariants.$inferSelect | undefined,
): AvailabilityVariantOverrideResponse => {
  if (!row)
    throw new InternalError(
      "Availability variant response could not be loaded",
    );
  return {
    id: row.id,
    menuItemId: row.menuItemId,
    status: row.status,
    manualOverrideStatus: row.manualOverrideStatus,
    manualOverrideReason: row.manualOverrideReason,
  };
};

type EffectiveAvailabilityRecord = {
  id: string;
  branchId: string | null;
  status: AvailabilityItemStateResponse["status"];
  basePrice: string | number;
  taxRate: string | number;
  prepTimeMinutes: number | null;
  manualOverrideStatus: AvailabilityItemStateResponse["manualOverrideStatus"];
  manualOverrideReason: string | null;
  manualStockCount: number | null;
  effectivePrice: string | number;
  effectiveTaxRate: string | number;
  effectivePrepTimeMinutes: number | null;
  effectiveStatus: AvailabilityItemStateResponse["status"];
  isHidden: boolean;
  availabilityReason: string;
  availabilityCause: EffectiveAvailabilityItemResponse["availabilityCause"];
  overrideApplied: boolean;
};

export const toEffectiveAvailabilityItemResponse = (
  row: EffectiveAvailabilityRecord,
): EffectiveAvailabilityItemResponse => ({
  id: row.id,
  branchId: row.branchId,
  status: row.status,
  basePrice: decimal(row.basePrice),
  taxRate: decimal(row.taxRate),
  prepTimeMinutes: row.prepTimeMinutes,
  manualOverrideStatus: row.manualOverrideStatus,
  manualOverrideReason: row.manualOverrideReason,
  manualStockCount: row.manualStockCount,
  effectivePrice: decimal(row.effectivePrice),
  effectiveTaxRate: decimal(row.effectiveTaxRate),
  effectivePrepTimeMinutes: row.effectivePrepTimeMinutes,
  effectiveStatus: row.effectiveStatus,
  isHidden: row.isHidden,
  availabilityReason: row.availabilityReason,
  availabilityCause: row.availabilityCause,
  overrideApplied: row.overrideApplied,
});
