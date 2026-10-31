import { voidDomainRequest } from "./shared";
import type {
  ActiveMenuResponse,
  AvailabilityBranchOverrideResponse,
  AvailabilityChannelOverrideRequest,
  AvailabilityChannelOverrideResponse,
  AvailabilityHolidayResponse,
  AvailabilityItemStateResponse,
  AvailabilityManualOverrideRequest,
  AvailabilityScheduleResponse,
  AvailabilityStockCountRequest,
  AvailabilityStockCountResponse,
  AvailabilityVariantOverrideRequest,
  AvailabilityVariantOverrideResponse,
  BulkDeleteResultResponse,
  BulkOperationResultResponse,
  BulkPriceOperationResultResponse,
  ComboPreviewResponse,
  ComboResponse,
  CreateAvailabilityHolidayRequest,
  CreateAvailabilityScheduleRequest,
  CreateKitchenStationRequest,
  CreateMenuItemRequest,
  CreateMenuRequest,
  KitchenItemRouteResponse,
  KitchenStationResponse,
  LoyaltyTierRequest,
  LoyaltyTierResponse,
  MenuAllergenResponse,
  MenuCategoryResponse,
  MenuImportCommitResult,
  MenuImportValidationResult,
  MenuItemResponse,
  MenuResponse,
  MenuScheduleRequest,
  MenuScheduleResponse,
  MenuTagResponse,
  MenuTemplateApplyResponse,
  MenuTemplateResponse,
  ModifierGroupResponse,
  PriceRuleResponse,
  PromotionPreviewResponse,
  PromotionResponse,
  PromotionStatsResponse,
  RecipeResponse,
  SetKitchenRouteRequest,
  SubRecipeResponse,
  UpdateMenuItemRequest,
  UpdateMenuRequest,
  UpsertAvailabilityBranchOverrideRequest,
} from "@pos/contracts";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  putDomainData,
  type DomainHttpClient,
} from "./shared";

export type MenuDto = MenuResponse;
export type ActiveMenuDto = ActiveMenuResponse;
export type MenuCategoryDto = MenuCategoryResponse;
export type MenuItemDto = MenuItemResponse;
export type MenuItemStatusDto = MenuItemResponse["status"];
export type MenuFulfillmentTypeDto = NonNullable<
  MenuResponse["availableFulfillmentTypes"]
>[number];
export type MenuScheduleDto = MenuScheduleResponse;
export type MenuWindowInput = MenuScheduleRequest;
export type MenuItemScheduleDto = AvailabilityScheduleResponse;
export type MenuHolidayDto = AvailabilityHolidayResponse;
export type MenuBranchOverrideDto = AvailabilityBranchOverrideResponse;
export type MenuChannelOverrideDto = AvailabilityChannelOverrideResponse;
export type MenuTagDto = MenuTagResponse;
export type MenuAllergenDto = MenuAllergenResponse;
export type ModifierGroupDto = ModifierGroupResponse;
export type MenuTemplateDto = MenuTemplateResponse;
export type SubRecipeDto = SubRecipeResponse;
export type MenuRecipeDto = RecipeResponse;
export type MenuComboDto = ComboResponse;
export type MenuPriceRuleDto = PriceRuleResponse;
export type MenuPromotionDto = PromotionResponse;
export type MenuPromotionStatsDto = PromotionStatsResponse;
export type MenuPromotionPreviewDto = PromotionPreviewResponse;
export type MenuComboPreviewDto = ComboPreviewResponse;
export type MenuLoyaltyTierDto = LoyaltyTierResponse;
export type MenuImportValidationDto = MenuImportValidationResult;
export type MenuImportCommitDto = MenuImportCommitResult;
export type MenuKitchenStationDto = KitchenStationResponse;
export type MenuKitchenRouteDto = KitchenItemRouteResponse;

export type CreateMenuItemInput = CreateMenuItemRequest;
export type UpdateMenuItemInput = UpdateMenuItemRequest;

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

export type MenuScheduleInput = CreateAvailabilityScheduleRequest;
export type BranchOverrideInput = UpsertAvailabilityBranchOverrideRequest;

export interface SubRecipeInput {
  name: string;
  yieldQuantity: number;
  yieldUnit: SubRecipeResponse["yieldUnit"];
  yieldPercent?: number | null;
  ingredients: Array<{
    inventoryItemId?: string | null;
    ingredientSubRecipeId?: string | null;
    quantity: number;
    unit: SubRecipeResponse["yieldUnit"];
  }>;
}

export const createMenuApi = (client: DomainHttpClient) => {
  return {
    listCategories(): Promise<MenuCategoryDto[]> {
      return getDomainData<MenuCategoryDto[]>(client, "/menu/categories");
    },
    listOrderableCategories(signal?: AbortSignal): Promise<MenuCategoryDto[]> {
      return getDomainData<MenuCategoryDto[]>(
        client,
        "/menu/categories",
        signal ? { signal } : undefined,
      );
    },
    createCategory(name: string): Promise<MenuCategoryDto> {
      return postDomainData<MenuCategoryDto>(client, "/menu/categories", {
        name,
      });
    },
    renameCategory(id: string, name: string): Promise<MenuCategoryDto> {
      return patchDomainData<MenuCategoryDto>(
        client,
        `/menu/categories/${id}`,
        { name },
      );
    },
    deleteCategory(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/categories/${id}`));
    },
    createItem(input: CreateMenuItemInput): Promise<MenuItemDto> {
      return postDomainData<MenuItemDto>(client, "/menu/items", input);
    },
    updateItem(id: string, input: UpdateMenuItemInput): Promise<MenuItemDto> {
      return patchDomainData<MenuItemDto>(client, `/menu/items/${id}`, input);
    },
    setManualStockCount(
      id: string,
      count: number | null,
      variantId?: string,
    ): Promise<AvailabilityStockCountResponse> {
      const input: AvailabilityStockCountRequest = {
        count,
        ...(variantId ? { variantId } : {}),
      };
      return postDomainData<AvailabilityStockCountResponse>(
        client,
        `/menu/items/${id}/stock-count`,
        input,
      );
    },
    setManualAvailabilityOverride(
      id: string,
      status: MenuItemStatusDto,
      reason: string,
    ): Promise<AvailabilityItemStateResponse> {
      const input: AvailabilityManualOverrideRequest = { status, reason };
      return putDomainData<AvailabilityItemStateResponse>(
        client,
        `/menu/items/${id}/manual-override`,
        input,
      );
    },
    clearManualAvailabilityOverride(
      id: string,
    ): Promise<AvailabilityItemStateResponse> {
      return client
        .delete(`/menu/items/${id}/manual-override`)
        .then(
          (response) => response.data.data as AvailabilityItemStateResponse,
        );
    },
    deleteItem(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/items/${id}`));
    },
    duplicateItem(id: string): Promise<MenuItemDto> {
      return postDomainData<MenuItemDto>(client, `/menu/items/${id}/duplicate`);
    },
    setPublished(id: string, publish: boolean): Promise<MenuItemDto> {
      return patchDomainData<MenuItemDto>(
        client,
        `/menu/items/${id}/${publish ? "publish" : "unpublish"}`,
      );
    },
    bulkSetStatus(
      itemIds: string[],
      status: MenuItemStatusDto,
      reason?: string,
    ): Promise<BulkOperationResultResponse> {
      return postDomainData<BulkOperationResultResponse>(
        client,
        "/menu/items/bulk/status",
        { itemIds, status, reason },
      );
    },
    bulkMoveCategory(
      itemIds: string[],
      categoryId: string,
    ): Promise<BulkOperationResultResponse> {
      return postDomainData<BulkOperationResultResponse>(
        client,
        "/menu/items/bulk/category",
        { itemIds, categoryId },
      );
    },
    bulkUpdateTags(
      itemIds: string[],
      tagIds: string[],
      mode: "add" | "remove" | "replace",
    ): Promise<BulkOperationResultResponse> {
      return postDomainData<BulkOperationResultResponse>(
        client,
        "/menu/items/bulk/tags",
        { itemIds, tagIds, mode },
      );
    },
    bulkAdjustPrice(
      itemIds: string[],
      priceChange: number,
      mode: "set" | "increase" | "decrease",
    ): Promise<BulkPriceOperationResultResponse> {
      return postDomainData<BulkPriceOperationResultResponse>(
        client,
        "/menu/items/bulk/price",
        { itemIds, priceChange, mode },
      );
    },
    bulkDelete(itemIds: string[]): Promise<BulkDeleteResultResponse> {
      return postDomainData<BulkDeleteResultResponse>(
        client,
        "/menu/items/bulk/delete",
        { itemIds },
      );
    },
    listMenus(): Promise<MenuDto[]> {
      return getDomainData<MenuDto[]>(client, "/menu/menus");
    },
    createMenu(input: CreateMenuRequest): Promise<MenuDto> {
      return postDomainData<MenuDto>(client, "/menu/menus", input);
    },
    updateMenu(id: string, input: UpdateMenuRequest): Promise<MenuDto> {
      return patchDomainData<MenuDto>(client, `/menu/menus/${id}`, input);
    },
    publishMenu(id: string): Promise<MenuDto> {
      return postDomainData<MenuDto>(client, `/menu/menus/${id}/publish`);
    },
    unpublishMenu(id: string): Promise<MenuDto> {
      return postDomainData<MenuDto>(client, `/menu/menus/${id}/unpublish`);
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
    listKitchenStations(): Promise<MenuKitchenStationDto[]> {
      return getDomainData<MenuKitchenStationDto[]>(
        client,
        "/kitchen/stations",
      );
    },
    createKitchenStation(
      input: CreateKitchenStationRequest,
    ): Promise<MenuKitchenStationDto> {
      return postDomainData<MenuKitchenStationDto>(
        client,
        "/kitchen/stations",
        input,
      );
    },
    removeKitchenStation(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/kitchen/stations/${id}`));
    },
    listStationRoutes(itemId: string): Promise<MenuKitchenRouteDto[]> {
      return getDomainData<MenuKitchenRouteDto[]>(
        client,
        `/kitchen/stations/routes/${itemId}`,
      );
    },
    setStationRoute(
      itemId: string,
      stationId: string,
      modifierOptionId?: string | null,
    ): Promise<MenuKitchenRouteDto> {
      const input: SetKitchenRouteRequest = {
        stationId,
        modifierOptionId: modifierOptionId ?? null,
      };
      return putDomainData<MenuKitchenRouteDto>(
        client,
        `/kitchen/stations/routes/${itemId}`,
        input,
      );
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
    listModifierGroups(): Promise<ModifierGroupDto[]> {
      return getDomainData<ModifierGroupDto[]>(client, "/menu/modifier-groups");
    },
    saveModifierGroup(
      existingId: string | null,
      payload: ModifierGroupPayload,
    ): Promise<ModifierGroupDto> {
      return existingId
        ? patchDomainData<ModifierGroupDto>(
            client,
            `/menu/modifier-groups/${existingId}`,
            payload,
          )
        : postDomainData<ModifierGroupDto>(
            client,
            "/menu/modifier-groups",
            payload,
          );
    },
    removeModifierGroup(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/modifier-groups/${id}`));
    },
    listTemplates(): Promise<MenuTemplateDto[]> {
      return getDomainData<MenuTemplateDto[]>(client, "/menu/templates");
    },
    removeTemplate(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/templates/${id}`));
    },
    applyTemplate(
      templateId: string,
      input: { branchId?: string; categoryName?: string },
    ): Promise<MenuTemplateApplyResponse> {
      return postDomainData<MenuTemplateApplyResponse>(
        client,
        `/menu/templates/${templateId}/apply`,
        input,
      );
    },
    saveTemplateFromCategory(
      categoryId: string,
      input: { name: string; description?: string },
    ): Promise<MenuTemplateDto> {
      return postDomainData<MenuTemplateDto>(
        client,
        `/menu/templates/from-category/${categoryId}`,
        input,
      );
    },
    listSubRecipes(): Promise<SubRecipeDto[]> {
      return getDomainData<SubRecipeDto[]>(client, "/menu/sub-recipes/");
    },
    createSubRecipe(input: SubRecipeInput): Promise<SubRecipeDto> {
      return postDomainData<SubRecipeDto>(client, "/menu/sub-recipes/", input);
    },
    updateSubRecipe(id: string, input: SubRecipeInput): Promise<SubRecipeDto> {
      return client
        .put(`/menu/sub-recipes/${id}`, input)
        .then((response) => response.data.data as SubRecipeDto);
    },
    removeSubRecipe(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/sub-recipes/${id}`));
    },
    listTags(): Promise<MenuTagDto[]> {
      return getDomainData<MenuTagDto[]>(client, "/menu/tags");
    },
    createTag(name: string, color: string): Promise<MenuTagDto> {
      return postDomainData<MenuTagDto>(client, "/menu/tags", { name, color });
    },
    removeTag(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/tags/${id}`));
    },
    listSchedules(itemId: string): Promise<MenuItemScheduleDto[]> {
      return getDomainData<MenuItemScheduleDto[]>(
        client,
        `/menu/items/${itemId}/schedules`,
      );
    },
    addSchedule(
      itemId: string,
      input: MenuScheduleInput,
    ): Promise<MenuItemScheduleDto> {
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
      return postDomainData<MenuItemScheduleDto>(
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
    listHolidays(): Promise<MenuHolidayDto[]> {
      return getDomainData<MenuHolidayDto[]>(client, "/menu/holidays");
    },
    addHoliday(
      input: CreateAvailabilityHolidayRequest,
    ): Promise<MenuHolidayDto> {
      return postDomainData<MenuHolidayDto>(client, "/menu/holidays", input);
    },
    removeHoliday(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/holidays/${id}`));
    },
    listBranchOverrides(itemId: string): Promise<MenuBranchOverrideDto[]> {
      return getDomainData<MenuBranchOverrideDto[]>(
        client,
        `/menu/items/${itemId}/branches`,
      );
    },
    saveBranchOverride(
      itemId: string,
      branchId: string,
      input: BranchOverrideInput,
    ): Promise<MenuBranchOverrideDto> {
      return putDomainData<MenuBranchOverrideDto>(
        client,
        `/menu/items/${itemId}/branch/${branchId}`,
        input,
      );
    },
    resetBranchOverride(itemId: string, branchId: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/menu/items/${itemId}/branch/${branchId}`),
      );
    },
    listActiveMenus(
      fulfillmentType: MenuFulfillmentTypeDto,
      signal?: AbortSignal,
    ): Promise<ActiveMenuDto[]> {
      return getDomainData<ActiveMenuDto[]>(client, "/menu/menus/active", {
        params: { channel: "STAFF", fulfillmentType },
        ...(signal ? { signal } : {}),
      });
    },
    listCombos(signal?: AbortSignal): Promise<MenuComboDto[]> {
      return getDomainData<MenuComboDto[]>(
        client,
        "/menu/combos",
        signal ? { signal } : undefined,
      );
    },
    listPromotions(signal?: AbortSignal): Promise<MenuPromotionDto[]> {
      return getDomainData<MenuPromotionDto[]>(
        client,
        "/menu/promotions",
        signal ? { signal } : undefined,
      );
    },
    listPriceRules(signal?: AbortSignal): Promise<MenuPriceRuleDto[]> {
      return getDomainData<MenuPriceRuleDto[]>(
        client,
        "/menu/price-rules",
        signal ? { signal } : undefined,
      );
    },
    listAllergens(): Promise<MenuAllergenDto[]> {
      return getDomainData<MenuAllergenDto[]>(client, "/menu/allergens");
    },
    getItemRecipes(itemId: string): Promise<MenuRecipeDto[]> {
      return getDomainData<MenuRecipeDto[]>(
        client,
        `/menu/items/${itemId}/recipes`,
      );
    },
    saveItemRecipes(
      itemId: string,
      ingredients: unknown[],
    ): Promise<MenuRecipeDto[]> {
      return postDomainData<MenuRecipeDto[]>(
        client,
        `/menu/items/${itemId}/recipes`,
        { ingredients },
      );
    },
    async downloadImportTemplate(format: "csv" | "xlsx"): Promise<Blob> {
      const response = await client.get<Blob>("/menu/import/items/template", {
        params: { format },
        responseType: "blob",
      });
      return response.data;
    },
    validateImport(form: FormData): Promise<MenuImportValidationResult> {
      return postDomainData<MenuImportValidationResult>(
        client,
        "/menu/import/items/validate",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
    },
    commitImport(form: FormData): Promise<MenuImportCommitResult> {
      return postDomainData<MenuImportCommitResult>(
        client,
        "/menu/import/items/commit",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
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
    listPromotionsFor(): Promise<MenuPromotionDto[]> {
      return getDomainData<MenuPromotionDto[]>(client, "/menu/promotions");
    },
    promotionStats(id: string): Promise<PromotionStatsResponse> {
      return getDomainData<PromotionStatsResponse>(
        client,
        `/menu/promotions/${id}/stats`,
      );
    },
    createPromotion(input: Record<string, unknown>): Promise<MenuPromotionDto> {
      return postDomainData<MenuPromotionDto>(
        client,
        "/menu/promotions",
        input,
      );
    },
    updatePromotion(
      id: string,
      patch: Record<string, unknown>,
    ): Promise<MenuPromotionDto> {
      return patchDomainData<MenuPromotionDto>(
        client,
        `/menu/promotions/${id}`,
        patch,
      );
    },
    removePromotion(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/promotions/${id}`));
    },
    previewPromotion(
      input: Record<string, unknown>,
    ): Promise<PromotionPreviewResponse> {
      return postDomainData<PromotionPreviewResponse>(
        client,
        "/menu/promotions/preview",
        input,
      );
    },
    createCombo(input: Record<string, unknown>): Promise<MenuComboDto> {
      return postDomainData<MenuComboDto>(client, "/menu/combos", input);
    },
    updateCombo(
      id: string,
      input: Record<string, unknown>,
    ): Promise<MenuComboDto> {
      return patchDomainData<MenuComboDto>(client, `/menu/combos/${id}`, input);
    },
    removeCombo(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/combos/${id}`));
    },
    previewCombo(
      input: Record<string, unknown>,
    ): Promise<ComboPreviewResponse> {
      return postDomainData<ComboPreviewResponse>(
        client,
        "/menu/combos/preview",
        input,
      );
    },
    listChannelOverrides(itemId: string): Promise<MenuChannelOverrideDto[]> {
      return getDomainData<MenuChannelOverrideDto[]>(
        client,
        `/menu/items/${itemId}/channel-overrides`,
      );
    },
    saveChannelOverride(
      itemId: string,
      input: AvailabilityChannelOverrideRequest,
    ): Promise<MenuChannelOverrideDto> {
      return putDomainData<MenuChannelOverrideDto>(
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
    listPriceRulesFor(
      params: Record<string, string | undefined> = {},
    ): Promise<MenuPriceRuleDto[]> {
      return getDomainData<MenuPriceRuleDto[]>(client, "/menu/price-rules", {
        params,
      });
    },
    createPriceRule(input: Record<string, unknown>): Promise<MenuPriceRuleDto> {
      return postDomainData<MenuPriceRuleDto>(
        client,
        "/menu/price-rules",
        input,
      );
    },
    removePriceRule(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/price-rules/${id}`));
    },
    createHappyHourRule(
      input: Record<string, unknown>,
    ): Promise<MenuPriceRuleDto[]> {
      return postDomainData<MenuPriceRuleDto[]>(
        client,
        "/menu/price-rules/happy-hour",
        input,
      );
    },
    listLoyaltyTiers(): Promise<MenuLoyaltyTierDto[]> {
      return getDomainData<MenuLoyaltyTierDto[]>(client, "/loyalty/tiers");
    },
    createLoyaltyTier(input: LoyaltyTierRequest): Promise<MenuLoyaltyTierDto> {
      return postDomainData<MenuLoyaltyTierDto>(
        client,
        "/loyalty/tiers",
        input,
      );
    },
    removeLoyaltyTier(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/loyalty/tiers/${id}`));
    },
    listMenuSchedules(menuId: string): Promise<MenuScheduleDto[]> {
      return getDomainData<MenuScheduleDto[]>(
        client,
        `/menu/menus/${menuId}/schedules`,
      );
    },
    createMenuSchedule(
      menuId: string,
      input: MenuScheduleRequest,
    ): Promise<MenuScheduleDto> {
      return postDomainData<MenuScheduleDto>(
        client,
        `/menu/menus/${menuId}/schedules`,
        input,
      );
    },
    removeMenuSchedule(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/menu/menus/schedules/${id}`));
    },
    updateVariantAvailability(
      variantId: string,
      input: AvailabilityVariantOverrideRequest,
    ): Promise<AvailabilityVariantOverrideResponse> {
      return putDomainData<AvailabilityVariantOverrideResponse>(
        client,
        `/menu/variants/${variantId}/availability`,
        input,
      );
    },
    updateModifierGroup(
      groupId: string,
      patch: Record<string, unknown>,
    ): Promise<ModifierGroupDto> {
      return patchDomainData<ModifierGroupDto>(
        client,
        `/menu/modifier-groups/${groupId}`,
        patch,
      );
    },
  };
};
