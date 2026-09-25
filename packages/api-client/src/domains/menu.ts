import { voidDomainRequest } from "./shared";
import type {
  FoodType,
  Holiday,
  ItemStationRoute,
  KitchenStation,
  Menu,
  MenuCategory,
  MenuItem,
  MenuItemBranchOverride,
  MenuItemSchedule,
  MenuItemScheduleType,
  MenuItemStatus,
  MenuTag,
  MenuTemplate,
  ModifierGroup,
  OrderableMenuCategory,
  SubRecipe,
  SpiceLevel,
  SubRecipeInput,
} from "@pos/types";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  putDomainData,
  type DomainHttpClient,
} from "./shared";

interface MenuItemWriteFields {
  name: string;
  description?: string | null;
  basePrice: number;
  manualCost?: number | null;
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN";
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null;
  openPriceMin?: number | null;
  openPriceMax?: number | null;
  supportsZones?: boolean;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF";
  manualStockCount?: number | null;
  taxRate: number;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null;
  foodType: FoodType;
  spiceLevel?: SpiceLevel | null;
  sku?: string | null;
  prepTimeMinutes?: number | null;
  hsnCode?: string | null;
  status: MenuItemStatus;
  availabilityReason: string | null;
  enableRecipeDeduction: boolean;
  displayMode?: "STANDARD" | "GUIDED_BUILDER";
  effectiveFrom?: string | null;
  modifierGroupIds: string[];
  tagIds: string[];
  allergenIds: string[];
  imageUrls: string[];
}

export interface CreateMenuItemInput extends MenuItemWriteFields {
  categoryId: string;
  variants: Array<{ name: string; price: number }>;
}

export interface UpdateMenuItemInput extends MenuItemWriteFields {
  variants: Array<{ id?: string; name: string; price: number }>;
}

export interface ModifierGroupPayload {
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  groupType?: "ADDON" | "SUBSTITUTION";
  dependsOnOptionId?: string | null;
  minSelections: number;
  maxSelections?: number;
  options: Array<{
    name: string;
    additionalPrice: number;
    maxQuantity: number;
    isDefault?: boolean;
    replacesDefaultComponent?: string;
  }>;
}

export interface MenuScheduleInput {
  scheduleType: MenuItemScheduleType;
  statusDuringPeriod: MenuItemStatus;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
  startDate?: string;
  endDate?: string;
  holidayName?: string;
}

export interface BranchOverrideInput {
  price: number | null;
  taxRate: number | null;
  prepTimeMinutes: number | null;
  status: MenuItemStatus | null;
  isHidden: boolean;
  availabilityReason: string | null;
}

export const createMenuApi = (client: DomainHttpClient) => {
  return {
    listCategories(): Promise<MenuCategory[]> {
      return getDomainData<MenuCategory[]>(client, "/menu/categories");
    },
    listOrderableCategories(
      signal?: AbortSignal,
    ): Promise<OrderableMenuCategory[]> {
      return getDomainData<OrderableMenuCategory[]>(
        client,
        "/menu/categories",
        signal ? { signal } : undefined,
      );
    },
    createCategory(name: string): Promise<MenuCategory> {
      return postDomainData<MenuCategory>(client, "/menu/categories", { name });
    },
    renameCategory(id: string, name: string): Promise<MenuCategory> {
      return patchDomainData<MenuCategory>(client, `/menu/categories/${id}`, {
        name,
      });
    },
    deleteCategory(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/categories/${id}`));
    },
    createItem(input: CreateMenuItemInput): Promise<MenuItem> {
      return postDomainData<MenuItem>(client, "/menu/items", input);
    },
    updateItem(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
      return patchDomainData<MenuItem>(client, `/menu/items/${id}`, input);
    },
    setManualStockCount(
      id: string,
      count: number | null,
      variantId?: string,
    ): Promise<void> {
      return voidDomainRequest(
        client.post(`/menu/items/${id}/stock-count`, {
          count,
          ...(variantId ? { variantId } : {}),
        }),
      );
    },
    setManualAvailabilityOverride(
      id: string,
      status: MenuItemStatus,
      reason: string,
    ): Promise<void> {
      return voidDomainRequest(
        client.put(`/menu/items/${id}/manual-override`, { status, reason }),
      );
    },
    clearManualAvailabilityOverride(id: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/menu/items/${id}/manual-override`),
      );
    },
    deleteItem(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/items/${id}`));
    },
    duplicateItem(id: string): Promise<MenuItem> {
      return postDomainData<MenuItem>(client, `/menu/items/${id}/duplicate`);
    },
    setPublished(id: string, publish: boolean): Promise<void> {
      return voidDomainRequest(
        client.patch(`/menu/items/${id}/${publish ? "publish" : "unpublish"}`),
      );
    },
    bulkSetStatus(
      itemIds: string[],
      status: MenuItemStatus,
      reason?: string,
    ): Promise<{ updated: number }> {
      return postDomainData<{ updated: number }>(
        client,
        "/menu/items/bulk/status",
        { itemIds, status, reason },
      );
    },
    bulkMoveCategory(
      itemIds: string[],
      categoryId: string,
    ): Promise<{ updated: number }> {
      return postDomainData<{ updated: number }>(
        client,
        "/menu/items/bulk/category",
        { itemIds, categoryId },
      );
    },
    bulkUpdateTags(
      itemIds: string[],
      tagIds: string[],
      mode: "add" | "remove" | "replace",
    ): Promise<{ updated: number }> {
      return postDomainData<{ updated: number }>(
        client,
        "/menu/items/bulk/tags",
        { itemIds, tagIds, mode },
      );
    },
    bulkAdjustPrice(
      itemIds: string[],
      priceChange: number,
      mode: "set" | "increase" | "decrease",
    ): Promise<{ updated: number }> {
      return postDomainData<{ updated: number }>(
        client,
        "/menu/items/bulk/price",
        { itemIds, priceChange, mode },
      );
    },
    bulkDelete(
      itemIds: string[],
    ): Promise<{ deleted: number; protected: number }> {
      return postDomainData<{ deleted: number; protected: number }>(
        client,
        "/menu/items/bulk/delete",
        { itemIds },
      );
    },
    listMenus(): Promise<Menu[]> {
      return getDomainData<Menu[]>(client, "/menu/menus");
    },
    createMenu(input: { name: string; description?: string }): Promise<Menu> {
      return postDomainData<Menu>(client, "/menu/menus", input);
    },
    updateMenu(
      id: string,
      input: Pick<
        Menu,
        "availableChannels" | "availableFulfillmentTypes" | "availableBranchIds"
      > & { effectiveFrom?: string | null },
    ): Promise<Menu> {
      return patchDomainData<Menu>(client, `/menu/menus/${id}`, input);
    },
    publishMenu(id: string): Promise<Menu> {
      return postDomainData<Menu>(client, `/menu/menus/${id}/publish`);
    },
    unpublishMenu(id: string): Promise<Menu> {
      return postDomainData<Menu>(client, `/menu/menus/${id}/unpublish`);
    },
    removeMenu(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/menus/${id}`));
    },
    assignItemToMenu(
      itemId: string,
      input: { menuId: string; categoryId: string; sortOrder?: number },
    ): Promise<void> {
      return voidDomainRequest(
        client.post(`/menu/items/${itemId}/memberships`, input),
      );
    },
    removeItemFromMenu(itemId: string, menuId: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/menu/items/${itemId}/memberships/${menuId}`),
      );
    },
    listKitchenStations(): Promise<KitchenStation[]> {
      return getDomainData<KitchenStation[]>(client, "/kitchen/stations");
    },
    createKitchenStation(input: {
      name: string;
      printerIdentifier?: string;
      sortOrder?: number;
    }): Promise<KitchenStation> {
      return postDomainData<KitchenStation>(client, "/kitchen/stations", input);
    },
    removeKitchenStation(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/kitchen/stations/${id}`));
    },
    listStationRoutes(itemId: string): Promise<ItemStationRoute[]> {
      return getDomainData<ItemStationRoute[]>(
        client,
        `/kitchen/stations/routes/${itemId}`,
      );
    },
    setStationRoute(
      itemId: string,
      stationId: string,
      modifierOptionId?: string | null,
    ): Promise<ItemStationRoute> {
      return client
        .put(`/kitchen/stations/routes/${itemId}`, {
          stationId,
          modifierOptionId: modifierOptionId ?? null,
        })
        .then((response) => response.data.data as ItemStationRoute);
    },
    removeStationRoute(
      itemId: string,
      modifierOptionId?: string | null,
    ): Promise<void> {
      return voidDomainRequest(
        client.delete(`/kitchen/stations/routes/${itemId}`, {
          params: modifierOptionId ? { modifierOptionId } : {},
        }),
      );
    },
    listModifierGroups(): Promise<ModifierGroup[]> {
      return getDomainData<ModifierGroup[]>(client, "/menu/modifier-groups");
    },
    saveModifierGroup(
      existingId: string | null,
      payload: ModifierGroupPayload,
    ): Promise<ModifierGroup> {
      return existingId
        ? patchDomainData<ModifierGroup>(
            client,
            `/menu/modifier-groups/${existingId}`,
            payload,
          )
        : postDomainData<ModifierGroup>(
            client,
            "/menu/modifier-groups",
            payload,
          );
    },
    removeModifierGroup(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/modifier-groups/${id}`));
    },
    listTemplates(): Promise<MenuTemplate[]> {
      return getDomainData<MenuTemplate[]>(client, "/menu/templates");
    },
    removeTemplate(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/templates/${id}`));
    },
    applyTemplate(
      templateId: string,
      input: { branchId?: string; categoryName?: string },
    ): Promise<void> {
      return voidDomainRequest(
        client.post(`/menu/templates/${templateId}/apply`, input),
      );
    },
    saveTemplateFromCategory(
      categoryId: string,
      input: { name: string; description?: string },
    ): Promise<MenuTemplate> {
      return postDomainData<MenuTemplate>(
        client,
        `/menu/templates/from-category/${categoryId}`,
        input,
      );
    },
    listSubRecipes(): Promise<SubRecipe[]> {
      return getDomainData<SubRecipe[]>(client, "/menu/sub-recipes/");
    },
    createSubRecipe(input: SubRecipeInput): Promise<SubRecipe> {
      return postDomainData<SubRecipe>(client, "/menu/sub-recipes/", input);
    },
    updateSubRecipe(id: string, input: SubRecipeInput): Promise<SubRecipe> {
      return client
        .put(`/menu/sub-recipes/${id}`, input)
        .then((response) => response.data.data as SubRecipe);
    },
    removeSubRecipe(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/sub-recipes/${id}`));
    },
    listTags(): Promise<MenuTag[]> {
      return getDomainData<MenuTag[]>(client, "/menu/tags");
    },
    createTag(name: string, color: string): Promise<MenuTag> {
      return postDomainData<MenuTag>(client, "/menu/tags", { name, color });
    },
    removeTag(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/tags/${id}`));
    },
    listSchedules(itemId: string): Promise<MenuItemSchedule[]> {
      return getDomainData<MenuItemSchedule[]>(
        client,
        `/menu/items/${itemId}/schedules`,
      );
    },
    addSchedule(
      itemId: string,
      input: MenuScheduleInput,
    ): Promise<MenuItemSchedule> {
      const payload: Record<string, unknown> = {
        scheduleType: input.scheduleType,
        statusDuringPeriod: input.statusDuringPeriod,
      };
      if (input.scheduleType === "DAILY" || input.scheduleType === "WEEKLY") {
        payload["startTime"] = input.startTime;
        payload["endTime"] = input.endTime;
      }
      if (input.scheduleType === "WEEKLY")
        payload["dayOfWeek"] = input.dayOfWeek;
      if (input.scheduleType === "SPECIFIC_DATE") {
        payload["startDate"] = input.startDate;
        payload["endDate"] = input.endDate || input.startDate;
      }
      if (input.scheduleType === "HOLIDAY")
        payload["holidayName"] = input.holidayName;
      return postDomainData<MenuItemSchedule>(
        client,
        `/menu/items/${itemId}/schedules`,
        payload,
      );
    },
    removeSchedule(scheduleId: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/menu/items/schedules/${scheduleId}`),
      );
    },
    listHolidays(): Promise<Holiday[]> {
      return getDomainData<Holiday[]>(client, "/menu/holidays");
    },
    addHoliday(input: {
      name: string;
      holidayDate: string;
      region?: string;
    }): Promise<Holiday> {
      return postDomainData<Holiday>(client, "/menu/holidays", input);
    },
    removeHoliday(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/holidays/${id}`));
    },
    listBranchOverrides(itemId: string): Promise<MenuItemBranchOverride[]> {
      return getDomainData<MenuItemBranchOverride[]>(
        client,
        `/menu/items/${itemId}/branches`,
      );
    },
    saveBranchOverride(
      itemId: string,
      branchId: string,
      input: BranchOverrideInput,
    ): Promise<void> {
      return voidDomainRequest(
        client.put(`/menu/items/${itemId}/branch/${branchId}`, input),
      );
    },
    resetBranchOverride(itemId: string, branchId: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/menu/items/${itemId}/branch/${branchId}`),
      );
    },
    listActiveMenus<T>(
      fulfillmentType: string,
      signal?: AbortSignal,
    ): Promise<T[]> {
      return getDomainData<T[]>(client, "/menu/menus/active", {
        params: { channel: "STAFF", fulfillmentType },
        ...(signal ? { signal } : {}),
      });
    },
    listCombos<T>(signal?: AbortSignal): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        "/menu/combos",
        signal ? { signal } : undefined,
      );
    },
    listPromotions<T>(signal?: AbortSignal): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        "/menu/promotions",
        signal ? { signal } : undefined,
      );
    },
    listPriceRules<T>(signal?: AbortSignal): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        "/menu/price-rules",
        signal ? { signal } : undefined,
      );
    },
    listAllergens<T>(): Promise<T[]> {
      return getDomainData<T[]>(client, "/menu/allergens");
    },
    getItemRecipes<T>(itemId: string): Promise<T[]> {
      return getDomainData<T[]>(client, `/menu/items/${itemId}/recipes`);
    },
    saveItemRecipes(itemId: string, ingredients: unknown[]): Promise<void> {
      return voidDomainRequest(
        client.post(`/menu/items/${itemId}/recipes`, { ingredients }),
      );
    },
    async downloadImportTemplate(format: "csv" | "xlsx"): Promise<Blob> {
      const response = await client.get<Blob>("/menu/import/items/template", {
        params: { format },
        responseType: "blob",
      });
      return response.data;
    },
    validateImport<T>(form: FormData): Promise<T> {
      return postDomainData<T>(client, "/menu/import/items/validate", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    commitImport<T>(form: FormData): Promise<T> {
      return postDomainData<T>(client, "/menu/import/items/commit", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    async exportEntity(
      entity: "items" | "categories" | "recipes" | "modifiers",
      format: "csv" | "xlsx",
    ): Promise<Blob> {
      const response = await client.get<Blob>(`/menu/export/${entity}`, {
        params: { format },
        responseType: "blob",
      });
      return response.data;
    },
    listPromotionsFor<T>(): Promise<T[]> {
      return getDomainData<T[]>(client, "/menu/promotions");
    },
    promotionStats<T>(id: string): Promise<T> {
      return getDomainData<T>(client, `/menu/promotions/${id}/stats`);
    },
    createPromotion<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/menu/promotions", input);
    },
    updatePromotion<T>(id: string, patch: Record<string, unknown>): Promise<T> {
      return patchDomainData<T>(client, `/menu/promotions/${id}`, patch);
    },
    removePromotion(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/promotions/${id}`));
    },
    previewPromotion<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/menu/promotions/preview", input);
    },
    createCombo<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/menu/combos", input);
    },
    updateCombo<T>(id: string, input: Record<string, unknown>): Promise<T> {
      return patchDomainData<T>(client, `/menu/combos/${id}`, input);
    },
    removeCombo(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/combos/${id}`));
    },
    previewCombo<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/menu/combos/preview", input);
    },
    listChannelOverrides<T>(itemId: string): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        `/menu/items/${itemId}/channel-overrides`,
      );
    },
    saveChannelOverride<T>(
      itemId: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return putDomainData<T>(
        client,
        `/menu/items/${itemId}/channel-overrides`,
        input,
      );
    },
    removeChannelOverride(id: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/menu/items/channel-overrides/${id}`),
      );
    },
    listPriceRulesFor<T>(
      params: Record<string, string | undefined> = {},
    ): Promise<T[]> {
      return getDomainData<T[]>(client, "/menu/price-rules", { params });
    },
    createPriceRule<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/menu/price-rules", input);
    },
    removePriceRule(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/price-rules/${id}`));
    },
    createHappyHourRule<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/menu/price-rules/happy-hour", input);
    },
    listLoyaltyTiers<T>(): Promise<T[]> {
      return getDomainData<T[]>(client, "/loyalty/tiers");
    },
    createLoyaltyTier<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/loyalty/tiers", input);
    },
    removeLoyaltyTier(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/loyalty/tiers/${id}`));
    },
    listMenuSchedules<T>(menuId: string): Promise<T[]> {
      return getDomainData<T[]>(client, `/menu/menus/${menuId}/schedules`);
    },
    createMenuSchedule<T>(
      menuId: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return postDomainData<T>(
        client,
        `/menu/menus/${menuId}/schedules`,
        input,
      );
    },
    removeMenuSchedule(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/menus/schedules/${id}`));
    },
    updateVariantAvailability<T>(
      variantId: string,
      input: { status: string | null; reason: string | null },
    ): Promise<T> {
      return putDomainData<T>(
        client,
        `/menu/variants/${variantId}/availability`,
        input,
      );
    },
    updateModifierGroup<T>(
      groupId: string,
      patch: Record<string, unknown>,
    ): Promise<T> {
      return patchDomainData<T>(
        client,
        `/menu/modifier-groups/${groupId}`,
        patch,
      );
    },
  };
};
