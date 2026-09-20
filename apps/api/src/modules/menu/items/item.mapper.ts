import type { MenuItemResponse } from "@pos/contracts";
import { effectiveModifierAvailability } from "@/modules/menu/availability/availability-view";
import { itemRepository } from "./item.repository";

export type MenuItemDetailRecord = NonNullable<
  Awaited<ReturnType<typeof itemRepository.findById>>
>;
type ItemDetail = MenuItemDetailRecord;

const toNumber = (value: string | number): number => Number(value);
const toNullableNumber = (value: string | number | null): number | null =>
  value == null ? null : Number(value);
const toIso = (value: Date): string => value.toISOString();
const toNullableIso = (value: Date | null): string | null =>
  value == null ? null : value.toISOString();

export const toMenuItemResponse = (item: ItemDetail): MenuItemResponse => ({
  id: item.id,
  tenantId: item.tenantId,
  branchId: item.branchId,
  categoryId: item.categoryId,
  name: item.name,
  description: item.description,
  basePrice: toNumber(item.basePrice),
  manualCost: toNullableNumber(item.manualCost),
  pricingMode: item.pricingMode,
  weightUnit: item.weightUnit,
  openPriceMin: toNullableNumber(item.openPriceMin),
  openPriceMax: toNullableNumber(item.openPriceMax),
  supportsZones: item.supportsZones,
  zonePricingRule: item.zonePricingRule,
  manualStockCount: item.manualStockCount,
  manualStockCountUpdatedAt: toNullableIso(item.manualStockCountUpdatedAt),
  taxRate: toNumber(item.taxRate),
  taxMode: item.taxMode,
  isAvailable: item.isAvailable,
  imageUrl: item.imageUrl,
  foodType: item.foodType,
  spiceLevel: item.spiceLevel,
  sku: item.sku,
  prepTimeMinutes: item.prepTimeMinutes,
  sortOrder: item.sortOrder,
  hsnCode: item.hsnCode,
  status: item.status,
  availabilityReason: item.availabilityReason,
  statusChangedAt: toIso(item.statusChangedAt),
  manualOverrideStatus: item.manualOverrideStatus,
  manualOverrideReason: item.manualOverrideReason,
  manualOverrideSetBy: item.manualOverrideSetBy,
  manualOverrideSetAt: toNullableIso(item.manualOverrideSetAt),
  enableRecipeDeduction: item.enableRecipeDeduction,
  displayMode: item.displayMode,
  effectiveFrom: toNullableIso(item.effectiveFrom),
  isPublished: item.isPublished,
  publishedAt: toNullableIso(item.publishedAt),
  variants: item.variants.map((variant) => ({
    id: variant.id,
    menuItemId: variant.menuItemId,
    name: variant.name,
    price: toNumber(variant.price),
    status: variant.status,
    manualOverrideStatus: variant.manualOverrideStatus,
    manualOverrideReason: variant.manualOverrideReason,
    manualStockCount: variant.manualStockCount,
    manualStockCountUpdatedAt: toNullableIso(variant.manualStockCountUpdatedAt),
  })),
  images: item.images.map((image) => ({
    id: image.id,
    menuItemId: image.menuItemId,
    url: image.url,
    sortOrder: image.sortOrder,
  })),
  modifierGroupLinks: item.modifierGroupLinks.map((link) => ({
    modifierGroupId: link.modifierGroupId,
    sortOrder: link.sortOrder,
    group: {
      id: link.group.id,
      tenantId: link.group.tenantId,
      branchId: link.group.branchId,
      name: link.group.name,
      selectionType: link.group.selectionType,
      groupType: link.group.groupType,
      minSelections: link.group.minSelections,
      maxSelections: link.group.maxSelections,
      sortOrder: link.group.sortOrder,
      dependsOnOptionId: link.group.dependsOnOptionId,
      options: link.group.options.map((option) => ({
        id: option.id,
        modifierGroupId: option.modifierGroupId,
        name: option.name,
        additionalPrice: toNumber(option.additionalPrice),
        isAvailable: effectiveModifierAvailability(option),
        computedAvailability: option.computedAvailability,
        manualOverrideAvailability: option.manualOverrideAvailability,
        maxQuantity: option.maxQuantity,
        sortOrder: option.sortOrder,
        isDefault: option.isDefault,
        replacesDefaultComponent: option.replacesDefaultComponent,
        variantPrices: option.variantPrices.map((variantPrice) => ({
          id: variantPrice.id,
          variantId: variantPrice.variantId,
          additionalPrice: toNumber(variantPrice.additionalPrice),
        })),
      })),
    },
  })),
  tagLinks: item.tagLinks.map((link) => ({
    tagId: link.tagId,
    tag: {
      id: link.tag.id,
      tenantId: link.tag.tenantId,
      name: link.tag.name,
      color: link.tag.color,
    },
  })),
  allergenLinks: item.allergenLinks.map((link) => ({
    allergenId: link.allergenId,
    allergen: {
      id: link.allergen.id,
      name: link.allergen.name,
    },
  })),
  recipeLinks: item.recipeLinks.map((link) => ({
    id: link.id,
    menuItemId: link.menuItemId,
    inventoryItemId: link.inventoryItemId,
    subRecipeId: link.subRecipeId,
    variantId: link.variantId,
    modifierOptionId: link.modifierOptionId,
    quantityRequired: toNumber(link.quantityRequired),
    unit: link.unit,
    yieldPercent: toNullableNumber(link.yieldPercent),
    isOptional: link.isOptional,
  })),
  menuMemberships: item.menuMemberships.map((membership) => ({
    id: membership.id,
    menuId: membership.menuId,
    menuItemId: membership.menuItemId,
    categoryId: membership.categoryId,
    sortOrder: membership.sortOrder,
  })),
});
