import {
  createMenuApi,
  type CreateMenuItemInput,
  type MenuCategoryDto,
  type MenuItemDto,
  type MenuItemStatusDto,
  type UpdateMenuItemInput,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

type CreateOnlyNullableFields =
  "manualStockCount" | "openPriceMin" | "openPriceMax" | "weightUnit";

export type MenuItemFormPayload = Omit<
  CreateMenuItemInput,
  CreateOnlyNullableFields
> &
  Pick<UpdateMenuItemInput, CreateOnlyNullableFields>;

const menuApi = createMenuApi(apiClient);

export const menuItemsService = {
  async listCategories(): Promise<MenuCategoryDto[]> {
    return menuApi.listCategories();
  },

  async addCategory(name: string): Promise<MenuCategoryDto> {
    return menuApi.createCategory(name);
  },

  async renameCategory(id: string, name: string): Promise<MenuCategoryDto> {
    return menuApi.renameCategory(id, name);
  },

  async deleteCategory(id: string): Promise<void> {
    await menuApi.deleteCategory(id);
  },

  async saveItem(
    item: Pick<MenuItemDto, "id"> | null,
    payload: MenuItemFormPayload,
  ): Promise<MenuItemDto> {
    if (!item) {
      const {
        manualStockCount,
        openPriceMax,
        openPriceMin,
        weightUnit,
        ...fields
      } = payload;
      const createPayload: CreateMenuItemInput = {
        ...fields,
        ...(manualStockCount != null ? { manualStockCount } : {}),
        ...(openPriceMax != null ? { openPriceMax } : {}),
        ...(openPriceMin != null ? { openPriceMin } : {}),
        ...(weightUnit != null ? { weightUnit } : {}),
      };
      return menuApi.createItem(createPayload);
    }
    const { categoryId: _categoryId, ...updatePayload } = payload;
    return menuApi.updateItem(
      item.id,
      updatePayload satisfies UpdateMenuItemInput,
    );
  },

  async updateVariantAvailability(
    id: string,
    unavailable: boolean,
  ): Promise<void> {
    await menuApi.updateVariantAvailability(id, {
      status: unavailable ? "OUT_OF_STOCK" : null,
      reason: unavailable ? "Manually 86'd" : null,
    });
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
    status: MenuItemStatusDto,
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

  async duplicateItem(id: string): Promise<MenuItemDto> {
    return menuApi.duplicateItem(id);
  },

  async setPublished(id: string, publish: boolean): Promise<void> {
    await menuApi.setPublished(id, publish);
  },

  async bulkSetStatus(
    itemIds: string[],
    status: MenuItemStatusDto,
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
