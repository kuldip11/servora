import {
  createMenuApi,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { MenuItem, MenuCategory, MenuItemStatus } from "@pos/types";

export type MenuItemFormPayload = CreateMenuItemInput;

const menuApi = createMenuApi(apiClient);

export const menuItemsService = {
  async listCategories(): Promise<MenuCategory[]> {
    return menuApi.listCategories();
  },

  async addCategory(name: string): Promise<MenuCategory> {
    return menuApi.createCategory(name);
  },

  async renameCategory(id: string, name: string): Promise<MenuCategory> {
    return menuApi.renameCategory(id, name);
  },

  async deleteCategory(id: string): Promise<void> {
    await menuApi.deleteCategory(id);
  },

  async saveItem(
    item: MenuItem | null,
    payload: MenuItemFormPayload,
  ): Promise<MenuItem> {
    if (!item) return menuApi.createItem(payload);
    const { categoryId: _categoryId, ...updatePayload } = payload;
    return menuApi.updateItem(
      item.id,
      updatePayload satisfies UpdateMenuItemInput,
    );
  },

  async setManualStockCount(
    id: string,
    count: number | null,
    variantId?: string,
  ): Promise<void> {
    await menuApi.setManualStockCount(id, count, variantId);
  },

  async setManualAvailabilityOverride(
    id: string,
    status: MenuItemStatus,
    reason: string,
  ): Promise<void> {
    await menuApi.setManualAvailabilityOverride(id, status, reason);
  },

  async clearManualAvailabilityOverride(id: string): Promise<void> {
    await menuApi.clearManualAvailabilityOverride(id);
  },

  async deleteItem(id: string): Promise<void> {
    await menuApi.deleteItem(id);
  },

  async duplicateItem(id: string): Promise<MenuItem> {
    return menuApi.duplicateItem(id);
  },

  async setPublished(id: string, publish: boolean): Promise<void> {
    await menuApi.setPublished(id, publish);
  },

  async bulkSetStatus(
    itemIds: string[],
    status: MenuItemStatus,
    reason?: string,
  ): Promise<{ updated: number }> {
    return menuApi.bulkSetStatus(itemIds, status, reason);
  },

  async bulkMoveCategory(
    itemIds: string[],
    categoryId: string,
  ): Promise<{ updated: number }> {
    return menuApi.bulkMoveCategory(itemIds, categoryId);
  },

  async bulkUpdateTags(
    itemIds: string[],
    tagIds: string[],
    mode: "add" | "remove" | "replace",
  ): Promise<{ updated: number }> {
    return menuApi.bulkUpdateTags(itemIds, tagIds, mode);
  },

  async bulkAdjustPrice(
    itemIds: string[],
    priceChange: number,
    mode: "set" | "increase" | "decrease",
  ): Promise<{ updated: number }> {
    return menuApi.bulkAdjustPrice(itemIds, priceChange, mode);
  },

  async bulkDelete(
    itemIds: string[],
  ): Promise<{ deleted: number; protected: number }> {
    return menuApi.bulkDelete(itemIds);
  },
};
