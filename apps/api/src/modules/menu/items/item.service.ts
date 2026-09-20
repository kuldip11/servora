import type { FoodType, MenuItemStatus, SpiceLevel } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { ValidationError, InternalError } from "@/core/errors";
import {
  assertMenuResourceBranch,
  resolveMenuBranch,
} from "@/modules/menu/menu-authorization";
import { itemRepository } from "./item.repository";
import { modifierRepository } from "@/modules/menu/modifiers/modifier.repository";
import { itemNotFound } from "./item.errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import { inventoryService } from "@/modules/inventory/inventory.service";

export interface CreateItemInput {
  categoryId: string;
  name: string;
  description?: string | null | undefined;
  basePrice: number;
  manualCost?: number | null | undefined;
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | undefined;
  openPriceMin?: number | undefined;
  openPriceMax?: number | undefined;
  supportsZones?: boolean | undefined;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
  manualStockCount?: number | undefined;
  taxRate?: number | undefined;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null | undefined;
  branchId?: string | undefined;
  foodType?: FoodType | undefined;
  spiceLevel?: SpiceLevel | null | undefined;
  sku?: string | null | undefined;
  prepTimeMinutes?: number | null | undefined;
  sortOrder?: number | undefined;
  hsnCode?: string | null | undefined;
  status?: MenuItemStatus | undefined;
  enableRecipeDeduction?: boolean | undefined;
  isPublished?: boolean | undefined;
  displayMode?: "STANDARD" | "GUIDED_BUILDER" | undefined;
  effectiveFrom?: string | null | undefined;
  availabilityReason?: string | null | undefined;
  variants?: Array<{ name: string; price: number }> | undefined;
  modifierGroupIds?: string[] | undefined;
  tagIds?: string[] | undefined;
  allergenIds?: string[] | undefined;
  imageUrls?: string[] | undefined;
}

export interface UpdateItemInput {
  name?: string | undefined;
  description?: string | null | undefined;
  basePrice?: number | undefined;
  manualCost?: number | null | undefined;
  pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null | undefined;
  openPriceMin?: number | null | undefined;
  openPriceMax?: number | null | undefined;
  supportsZones?: boolean | undefined;
  zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
  manualStockCount?: number | null | undefined;
  taxRate?: number | undefined;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null | undefined;
  foodType?: FoodType | undefined;
  spiceLevel?: SpiceLevel | null | undefined;
  sku?: string | null | undefined;
  prepTimeMinutes?: number | null | undefined;
  sortOrder?: number | undefined;
  hsnCode?: string | null | undefined;
  status?: MenuItemStatus | undefined;
  availabilityReason?: string | null | undefined;
  enableRecipeDeduction?: boolean | undefined;
  displayMode?: "STANDARD" | "GUIDED_BUILDER" | undefined;
  effectiveFrom?: string | null | undefined;
  tagIds?: string[] | undefined;
  allergenIds?: string[] | undefined;
  modifierGroupIds?: string[] | undefined;
  imageUrls?: string[] | undefined;
  variants?: Array<{ id?: string; name: string; price: number }> | undefined;
}

export interface DuplicateItemInput {
  name?: string | undefined;
  copyRecipes?: boolean | undefined;
  copySchedules?: boolean | undefined;
  copyModifiers?: boolean | undefined;
}

const validateReferences = async (
  tenantId: string,
  branchId: string | null | undefined,
  tagIds: string[] | undefined,
  modifierGroupIds: string[] | undefined,
) => {
  if (tagIds?.length) {
    const ownedTags = await modifierRepository.findOwnedTagIds(
      tenantId,
      tagIds,
    );
    const invalid = tagIds.filter((id) => !ownedTags.has(id));
    if (invalid.length)
      throw new ValidationError(
        "One or more menu tags do not belong to this tenant",
      );
  }

  if (modifierGroupIds?.length) {
    const ownedGroups = await modifierRepository.findOwnedModifierGroupIds(
      tenantId,
      branchId ?? null,
      modifierGroupIds,
    );
    const invalid = modifierGroupIds.filter((id) => !ownedGroups.has(id));
    if (invalid.length)
      throw new ValidationError(
        "One or more modifier groups are outside the active tenant or branch",
      );
  }
};

const validateAdvancedPricing = (
  input: {
    pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
    weightUnit?: "G" | "KG" | "LB" | "OZ" | null | undefined;
    openPriceMin?: number | null | undefined;
    openPriceMax?: number | null | undefined;
    supportsZones?: boolean | undefined;
    zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
    manualStockCount?: number | null | undefined;
  },
  fallback?: {
    pricingMode?: string;
    weightUnit?: string | null;
    openPriceMin?: string | null;
    openPriceMax?: string | null;
  },
) => {
  const mode = input.pricingMode ?? fallback?.pricingMode ?? "FIXED";
  const weightUnit =
    input.weightUnit === undefined ? fallback?.weightUnit : input.weightUnit;
  if (mode === "WEIGHT_BASED" && !weightUnit)
    throw new ValidationError("Weight-based items require a weight unit");
  const min =
    input.openPriceMin === undefined
      ? fallback?.openPriceMin == null
        ? null
        : Number(fallback.openPriceMin)
      : input.openPriceMin;
  const max =
    input.openPriceMax === undefined
      ? fallback?.openPriceMax == null
        ? null
        : Number(fallback.openPriceMax)
      : input.openPriceMax;
  if (min != null && max != null && min > max)
    throw new ValidationError("Open-price minimum cannot exceed maximum");
  if (
    input.manualStockCount != null &&
    (!Number.isInteger(input.manualStockCount) || input.manualStockCount < 0)
  )
    throw new ValidationError(
      "Manual stock count must be a non-negative integer",
    );
};

export const itemService = {
  async getById(auth: AuthContext, itemId: string) {
    requirePermission(auth, "menu:read");
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, item.branchId, { allowShared: true });
    return item;
  },

  async create(auth: AuthContext, input: CreateItemInput) {
    requirePermission(auth, "menu:create");
    const branchId = resolveMenuBranch(auth, input.branchId);
    const category = await itemRepository.findCategory(
      auth.tenantId,
      input.categoryId,
    );
    if (!category) throw itemNotFound(input.categoryId);
    if (category.branchId && category.branchId !== branchId) {
      throw new ValidationError(
        "Category branch does not match the active menu branch",
      );
    }
    validateAdvancedPricing(input);
    await validateReferences(
      auth.tenantId,
      branchId,
      input.tagIds,
      input.modifierGroupIds,
    );
    const created = await itemRepository.create({
      tenantId: auth.tenantId,
      ...input,
      branchId,
      basePrice: String(input.basePrice),
      manualCost:
        input.manualCost == null ? input.manualCost : String(input.manualCost),
      openPriceMin:
        input.openPriceMin === undefined
          ? undefined
          : String(input.openPriceMin),
      openPriceMax:
        input.openPriceMax === undefined
          ? undefined
          : String(input.openPriceMax),
      taxRate: input.taxRate !== undefined ? String(input.taxRate) : "0",
      effectiveFrom: input.effectiveFrom
        ? new Date(input.effectiveFrom)
        : undefined,
      variants: input.variants?.map((v) => ({
        name: v.name,
        price: String(v.price),
      })),
    });
    if (!created) throw new InternalError("Menu item could not be created");
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async update(auth: AuthContext, itemId: string, input: UpdateItemInput) {
    requirePermission(auth, "menu:update");
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
    const {
      tagIds,
      allergenIds,
      modifierGroupIds,
      imageUrls,
      variants,
      ...itemFields
    } = input;
    validateAdvancedPricing(itemFields, existing);
    await validateReferences(
      auth.tenantId,
      existing.branchId,
      tagIds,
      modifierGroupIds,
    );
    if (variants !== undefined) {
      const variantValidation = await itemRepository.validateVariantSync(
        auth.tenantId,
        itemId,
        variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}),
          name: variant.name,
          price: String(variant.price),
        })),
      );
      if (!variantValidation.ok) {
        if (variantValidation.reason === "VARIANT_IN_USE") {
          throw new ValidationError(
            "This variant is already used by an order or combo and cannot be deleted. Rename it or change its price instead.",
          );
        }
        throw new ValidationError(
          "One or more variants do not belong to this menu item",
        );
      }
    }

    const updated = await itemRepository.update(auth.tenantId, itemId, {
      ...itemFields,
      basePrice:
        itemFields.basePrice !== undefined
          ? String(itemFields.basePrice)
          : undefined,
      manualCost:
        itemFields.manualCost === undefined
          ? undefined
          : itemFields.manualCost === null
            ? null
            : String(itemFields.manualCost),
      taxRate:
        itemFields.taxRate !== undefined
          ? String(itemFields.taxRate)
          : undefined,
      openPriceMin:
        itemFields.openPriceMin === undefined
          ? undefined
          : itemFields.openPriceMin === null
            ? null
            : String(itemFields.openPriceMin),
      openPriceMax:
        itemFields.openPriceMax === undefined
          ? undefined
          : itemFields.openPriceMax === null
            ? null
            : String(itemFields.openPriceMax),
      manualStockCountUpdatedAt:
        itemFields.manualStockCount === undefined ? undefined : new Date(),
      effectiveFrom:
        itemFields.effectiveFrom === undefined
          ? undefined
          : itemFields.effectiveFrom
            ? new Date(itemFields.effectiveFrom)
            : null,
    });
    if (!updated) throw itemNotFound(itemId);

    if (tagIds !== undefined)
      await itemRepository.setTags(auth.tenantId, itemId, tagIds);
    if (allergenIds !== undefined)
      await itemRepository.setAllergens(auth.tenantId, itemId, allergenIds);
    if (modifierGroupIds !== undefined)
      await itemRepository.setModifierGroups(
        auth.tenantId,
        itemId,
        modifierGroupIds,
      );
    if (imageUrls !== undefined)
      await itemRepository.setImages(auth.tenantId, itemId, imageUrls);
    if (variants !== undefined) {
      const variantsUpdated = await itemRepository.setVariants(
        auth.tenantId,
        itemId,
        variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}),
          name: variant.name,
          price: String(variant.price),
        })),
      );
      if (!variantsUpdated) {
        throw new ValidationError(
          "One or more variants do not belong to this menu item",
        );
      }
    }

    const result = await itemRepository.findById(auth.tenantId, itemId);
    if (!result) throw itemNotFound(itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "UPDATED",
      buildDiff(existing, result),
    );
    if (
      existing.enableRecipeDeduction !== result.enableRecipeDeduction &&
      result.branchId
    ) {
      if (result.enableRecipeDeduction) {
        await inventoryService.syncRecipeConfigurationAvailability(
          auth.tenantId,
          result.branchId,
          itemId,
        );
      } else {
        await inventoryService.clearRecipeAvailabilitySignals(
          auth.tenantId,
          result.branchId,
          itemId,
        );
      }
    }
    return result;
  },

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
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
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
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
    const published = await itemRepository.publish(auth.tenantId, itemId);
    if (!published) throw itemNotFound(itemId);
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
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
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
    const unpublished = await itemRepository.unpublish(auth.tenantId, itemId);
    if (!unpublished) throw itemNotFound(itemId);
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
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
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
    const updated = await itemRepository.updateStatus(
      auth.tenantId,
      itemId,
      status,
      reason,
    );
    if (!updated) throw itemNotFound(itemId);
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "UPDATED",
      buildDiff(existing, item),
    );
    return item;
  },

  async updateAvailability(
    auth: AuthContext,
    itemId: string,
    isAvailable: boolean,
    reason?: string | undefined,
  ) {
    requirePermission(auth, "menu:update");
    const existing = await itemRepository.findById(auth.tenantId, itemId);
    if (!existing) throw itemNotFound(itemId);
    assertMenuResourceBranch(auth, existing.branchId);
    const updated = await itemRepository.updateStatus(
      auth.tenantId,
      itemId,
      isAvailable ? "ACTIVE" : "OUT_OF_STOCK",
      reason,
    );
    if (!updated) throw itemNotFound(itemId);
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    await menuChangeLog.record(
      auth,
      "MENU_ITEM",
      itemId,
      "UPDATED",
      buildDiff(existing, item),
    );
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
