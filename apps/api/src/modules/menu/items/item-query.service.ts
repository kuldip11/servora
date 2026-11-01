import type { MenuItemStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import {
  assertMenuResourceBranch,
  resolveMenuBranch,
} from "@/modules/menu/menu-authorization";
import { itemNotFound } from "./item.errors";
import { itemRepository } from "./item.repository";

export const itemQueryService = {
  async getById(auth: AuthContext, itemId: string) {
    requirePermission(auth, "menu:read");
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, item.branchId, { allowShared: true });
    return item;
  },

  async listByStatus(
    auth: AuthContext,
    statuses: MenuItemStatus[],
    categoryId?: string | undefined,
  ) {
    requirePermission(auth, "menu:read");
    resolveMenuBranch(auth);
    return itemRepository.findByStatus(
      auth.tenantId,
      auth.branchId,
      statuses,
      categoryId,
    );
  },
};
