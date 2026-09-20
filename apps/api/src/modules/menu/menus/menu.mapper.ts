import type {
  ActiveMenuResponse,
  MenuResponse,
  MenuScheduleResponse,
} from "@pos/contracts";
import { menus, menuSchedules } from "@/db/schema";

export type MenuRecord = typeof menus.$inferSelect;
type MenuScheduleRecord = typeof menuSchedules.$inferSelect;

type ActiveMenuRecord = MenuRecord & {
  memberships?: Array<{
    id: string;
    menuId: string;
    menuItemId: string;
    categoryId: string;
    sortOrder: number;
  }>;
};

const MENU_CHANNELS = new Set(["STAFF", "CUSTOMER_QR"] as const);
const FULFILLMENT_TYPES = new Set([
  "DINE_IN",
  "TAKEAWAY",
  "DELIVERY",
  "ONLINE",
] as const);

const toChannels = (
  values: string[] | null,
): MenuResponse["availableChannels"] =>
  values
    ? values.filter((value): value is "STAFF" | "CUSTOMER_QR" =>
        MENU_CHANNELS.has(value as "STAFF" | "CUSTOMER_QR"),
      )
    : null;

const toFulfillmentTypes = (
  values: string[] | null,
): MenuResponse["availableFulfillmentTypes"] =>
  values
    ? values.filter(
        (value): value is "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" =>
          FULFILLMENT_TYPES.has(
            value as "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE",
          ),
      )
    : null;

export const toMenuResponse = (menu: MenuRecord): MenuResponse => ({
  id: menu.id,
  tenantId: menu.tenantId,
  organizationId: menu.organizationId,
  name: menu.name,
  description: menu.description,
  status: menu.status,
  isDefault: menu.isDefault,
  availableChannels: toChannels(menu.availableChannels),
  availableFulfillmentTypes: toFulfillmentTypes(menu.availableFulfillmentTypes),
  availableBranchIds: menu.availableBranchIds,
  effectiveFrom: menu.effectiveFrom?.toISOString() ?? null,
  createdAt: menu.createdAt.toISOString(),
  updatedAt: menu.updatedAt.toISOString(),
});

export const toActiveMenuResponse = (
  menu: ActiveMenuRecord,
): ActiveMenuResponse => ({
  ...toMenuResponse(menu),
  memberships: (menu.memberships ?? []).map((membership) => ({
    id: membership.id,
    menuId: membership.menuId,
    menuItemId: membership.menuItemId,
    categoryId: membership.categoryId,
    sortOrder: membership.sortOrder,
  })),
});

export const toMenuScheduleResponse = (
  schedule: MenuScheduleRecord,
): MenuScheduleResponse => ({
  id: schedule.id,
  tenantId: schedule.tenantId,
  menuId: schedule.menuId,
  scheduleType: schedule.scheduleType,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  dayOfWeek: schedule.dayOfWeek,
  startDate: schedule.startDate,
  endDate: schedule.endDate,
  holidayName: schedule.holidayName,
  isActive: schedule.isActive,
  createdAt: schedule.createdAt.toISOString(),
  updatedAt: schedule.updatedAt.toISOString(),
});
