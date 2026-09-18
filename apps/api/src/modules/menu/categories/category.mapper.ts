import type { MenuCategoryResponse } from "@pos/contracts";
import { menuCategories } from "@/db/schema";
import type { MenuItemDetailRecord } from "@/modules/menu/items/item.mapper";
import { toMenuItemResponse } from "@/modules/menu/items/item.mapper";

type CategoryRecord = typeof menuCategories.$inferSelect & {
  menuItems?: MenuItemDetailRecord[];
};

export const toMenuCategoryResponse = (
  category: CategoryRecord,
): MenuCategoryResponse => ({
  id: category.id,
  tenantId: category.tenantId,
  branchId: category.branchId,
  name: category.name,
  description: category.description,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
  ...(category.menuItems
    ? { menuItems: category.menuItems.map(toMenuItemResponse) }
    : {}),
});
