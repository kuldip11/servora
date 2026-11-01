import type { MenuItemStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import { assertMenuResourceBranch } from "@/modules/menu/menu-authorization";
import { itemNotFound } from "./item.errors";
import { itemRepository } from "./item.repository";
import type { DuplicateItemInput } from "./item.types";

const findScopedItem = async (auth: AuthContext, itemId: string) => {
  const item = await itemRepository.findById(auth.tenantId, itemId);
  if (!item) throw itemNotFound(itemId);
  assertMenuResourceBranch(auth, item.branchId);
  return item;
};

const loadUpdatedItem = async (auth: AuthContext, itemId: string) => {
  const item = await itemRepository.findById(auth.tenantId, itemId);
  if (!item) throw itemNotFound(itemId);
  return item;
};

const recordUpdatedItem = async (
  auth: AuthContext,
  itemId: string,
  existing: Awaited<ReturnType<typeof findScopedItem>>,
) => {
  const item = await loadUpdatedItem(auth, itemId);
  await menuChangeLog.record(
    auth,
    "MENU_ITEM",
    itemId,
    "UPDATED",
    buildDiff(existing, item),
  );
  return item;
};

export const itemLifecycleService = {
  async remove(auth: AuthContext, itemId: string): Promise<void> {
    requirePermission(auth, "menu:delete");
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) return;
    assertMenuResourceBranch(auth, existing.branchId);
    await itemRepository.softDelete(auth.tenantId, itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "DELETED",
      buildDiff(existing, null),
    );
  },

  async duplicate(
    auth: AuthContext,
    itemId: string,
    input: DuplicateItemInput,
  ) {
    requirePermission(auth, "menu:create");
    await findScopedItem(auth, itemId);
    const copy = await itemRepository.duplicate(auth.tenantId, itemId, input);
    if (!copy) throw itemNotFound(itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      copy.id,
      "CREATED",
      buildDiff(null, copy),
    );
    return copy;
  },

  async publish(auth: AuthContext, itemId: string) {
    requirePermission(auth, "menu:publish");
    const existing = await findScopedItem(auth, itemId);
    const published = await itemRepository.publish(auth.tenantId, itemId);
    if (!published) throw itemNotFound(itemId);
    const item = await loadUpdatedItem(auth, itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "PUBLISHED",
      buildDiff(existing, item),
    );
    return item;
  },

  async unpublish(auth: AuthContext, itemId: string) {
    requirePermission(auth, "menu:publish");
    const existing = await findScopedItem(auth, itemId);
    const unpublished = await itemRepository.unpublish(auth.tenantId, itemId);
    if (!unpublished) throw itemNotFound(itemId);
    const item = await loadUpdatedItem(auth, itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "ARCHIVED",
      buildDiff(existing, item),
    );
    return item;
  },

  async updateStatus(
    auth: AuthContext,
    itemId: string,
    status: MenuItemStatus,
    reason?: string | undefined,
  ) {
    requirePermission(auth, "menu:update");
    const existing = await findScopedItem(auth, itemId);
    const updated = await itemRepository.updateStatus(
      auth.tenantId,
      itemId,
      status,
      reason,
    );
    if (!updated) throw itemNotFound(itemId);
    return recordUpdatedItem(auth, itemId, existing);
  },

  async updateAvailability(
    auth: AuthContext,
    itemId: string,
    isAvailable: boolean,
    reason?: string | undefined,
  ) {
    requirePermission(auth, "menu:update");
    const existing = await findScopedItem(auth, itemId);
    const updated = await itemRepository.updateStatus(
      auth.tenantId,
      itemId,
      isAvailable ? "ACTIVE" : "OUT_OF_STOCK",
      reason,
    );
    if (!updated) throw itemNotFound(itemId);
    return recordUpdatedItem(auth, itemId, existing);
  },
};
