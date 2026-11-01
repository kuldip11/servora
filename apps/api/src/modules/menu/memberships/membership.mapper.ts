import type { MenuMembershipResponse } from "@pos/contracts";

export const toMenuMembershipResponse = (row: any): MenuMembershipResponse => ({
  id: row.id,
  menuId: row.menuId,
  menuItemId: row.menuItemId,
  categoryId: row.categoryId,
  sortOrder: row.sortOrder,
});
