import type { OrderType } from "@pos/types";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { holidays, menuItems, menus, tenants } from "@/db/schema";
import type { AvailabilityChannel } from "@/modules/menu/availability/availability.service";
import { highestPriorityActiveSchedule } from "@/modules/menu/availability/schedule-precedence";

type ScopedMenu = typeof menus.$inferSelect;

export const menuMatchesContext = (
  menu: Pick<
    ScopedMenu,
    "availableChannels" | "availableFulfillmentTypes" | "availableBranchIds"
  >,
  branchId: string,
  channel: AvailabilityChannel,
  fulfillmentType: OrderType,
) => {
  return (
    (!menu.availableChannels || menu.availableChannels.includes(channel)) &&
    (!menu.availableFulfillmentTypes ||
      menu.availableFulfillmentTypes.includes(fulfillmentType)) &&
    (!menu.availableBranchIds || menu.availableBranchIds.includes(branchId))
  );
};

export const itemMatchesBranch = (
  itemBranchId: string | null,
  branchId: string,
) => {
  return itemBranchId === null || itemBranchId === branchId;
};
export const isEffectiveAt = (effectiveFrom: Date | null, asOf: Date) => {
  return !effectiveFrom || effectiveFrom <= asOf;
};

export const itemIsPublishedAt = (
  item: Pick<
    typeof menuItems.$inferSelect,
    "isPublished" | "deletedAt" | "effectiveFrom"
  >,
  asOf: Date,
) => {
  return (
    item.isPublished &&
    item.deletedAt === null &&
    isEffectiveAt(item.effectiveFrom, asOf)
  );
};

export const preferSpecializedMenus = <T extends { isDefault: boolean }>(
  resolvedMenus: T[],
) => {
  const specialized = resolvedMenus.filter((menu) => !menu.isDefault);
  return specialized.length ? specialized : resolvedMenus;
};

const activeTenantMenus = async (
  tenantId: string,
  branchId: string,
  channel: AvailabilityChannel,
  fulfillmentType: OrderType,
  asOf: Date,
) => {
  const published = await db.query.menus.findMany({
    where: eq(menus.tenantId, tenantId),
    with: { memberships: { with: { item: true } }, schedules: true },
  });
  const contextMatches = published.filter(
    (menu) =>
      menu.status === "PUBLISHED" &&
      isEffectiveAt(menu.effectiveFrom, asOf) &&
      menuMatchesContext(menu, branchId, channel, fulfillmentType),
  );
  const active = await Promise.all(
    contextMatches.map(async (menu) => {
      if (!menu.schedules.length) return menu;
      const match = await highestPriorityActiveSchedule(
        menu.schedules,
        asOf,
        async (name, date) =>
          !!(await db.query.holidays.findFirst({
            where: and(
              eq(holidays.tenantId, tenantId),
              eq(holidays.name, name),
              eq(holidays.holidayDate, date),
            ),
          })),
      );
      return match ? menu : null;
    }),
  );
  return active
    .filter((menu): menu is NonNullable<typeof menu> => !!menu)
    .map((menu) => ({
      ...menu,
      memberships: menu.memberships.filter((membership) =>
        itemIsPublishedAt(membership.item, asOf),
      ),
    }));
};

const inheritedOrganizationMenus = async (
  tenantId: string,
  branchId: string,
  channel: AvailabilityChannel,
  fulfillmentType: OrderType,
  asOf: Date,
) => {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { organizationId: true },
  });
  if (!tenant?.organizationId) return [];
  const orgMenus = await db.query.menus.findMany({
    where: eq(menus.organizationId, tenant.organizationId),
    with: { organizationItems: true },
  });
  const active = orgMenus.filter(
    (menu) =>
      menu.status === "PUBLISHED" &&
      isEffectiveAt(menu.effectiveFrom, asOf) &&
      menuMatchesContext(menu, branchId, channel, fulfillmentType),
  );
  const skus = [
    ...new Set(
      active.flatMap((menu) =>
        menu.organizationItems.map((entry) => entry.itemSku),
      ),
    ),
  ];
  if (!skus.length) return [];
  const localItems = (
    await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        inArray(menuItems.sku, skus),
      ),
    })
  ).filter((item) => itemIsPublishedAt(item, asOf));
  const itemBySku = new Map(
    localItems
      .filter((item) => item.sku)
      .map((item) => [item.sku!, item] as const),
  );
  return active.map((menu) => ({
    ...menu,
    schedules: [],
    memberships: menu.organizationItems.flatMap((entry) => {
      const item = itemBySku.get(entry.itemSku);
      if (!item) return [];
      return [
        {
          id: `org:${entry.id}`,
          menuId: menu.id,
          menuItemId: item.id,
          categoryId: item.categoryId,
          sortOrder: entry.sortOrder,
          createdAt: entry.createdAt,
          item,
        },
      ];
    }),
  }));
};

export const menuResolver = {
  async getActiveMenus(
    tenantId: string,
    branchId: string,
    channel: AvailabilityChannel,
    fulfillmentType: OrderType,
    asOf: Date,
  ) {
    const local = await activeTenantMenus(
      tenantId,
      branchId,
      channel,
      fulfillmentType,
      asOf,
    );
    const preferredLocal = preferSpecializedMenus(local);
    if (preferredLocal.length) return preferredLocal;

    return inheritedOrganizationMenus(
      tenantId,
      branchId,
      channel,
      fulfillmentType,
      asOf,
    );
  },
  async getActiveItemIds(
    tenantId: string,
    branchId: string,
    channel: AvailabilityChannel,
    fulfillmentType: OrderType,
    asOf: Date,
  ) {
    const activeMenus = await this.getActiveMenus(
      tenantId,
      branchId,
      channel,
      fulfillmentType,
      asOf,
    );
    return new Set(
      activeMenus.flatMap((menu) =>
        menu.memberships
          .filter((membership) =>
            itemMatchesBranch(membership.item.branchId, branchId),
          )
          .map((membership) => membership.menuItemId),
      ),
    );
  },
};
