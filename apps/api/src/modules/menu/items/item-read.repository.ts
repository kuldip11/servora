import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { MenuItemStatus } from "@pos/types";
import { db } from "@/db";
import { menuCategories, menuItems, menus, menuMemberships } from "@/db/schema";
import { ITEM_DETAIL_RELATIONS, withItemReadModel } from "./item-read-model";

export const itemReadRepository = {
  async findCategory(tenantId: string, categoryId: string) {
    return db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.tenantId, tenantId),
      ),
      columns: { id: true, branchId: true },
    });
  },

  async findIdsByCategory(tenantId: string, categoryId: string) {
    const rows = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        eq(menuItems.categoryId, categoryId),
        isNull(menuItems.deletedAt),
      ),
      columns: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findIdsByMenu(tenantId: string, menuId: string) {
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!menu) return null;
    const rows = await db.query.menuMemberships.findMany({
      where: eq(menuMemberships.menuId, menuId),
      columns: { menuItemId: true },
    });
    return rows.map((row) => row.menuItemId);
  },

  async findById(tenantId: string, itemId: string) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      with: ITEM_DETAIL_RELATIONS,
    });
    return item ? withItemReadModel(item) : undefined;
  },

  async findByStatus(
    tenantId: string,
    branchId: string | null | undefined,
    statuses: MenuItemStatus[],
    categoryId?: string | undefined,
  ) {
    const items = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        isNull(menuItems.deletedAt),
        inArray(menuItems.status, statuses),
        branchId
          ? or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId))
          : undefined,
        categoryId ? eq(menuItems.categoryId, categoryId) : undefined,
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
      with: ITEM_DETAIL_RELATIONS,
    });
    return items.map(withItemReadModel);
  },
};
