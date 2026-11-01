import type {
  ModifierGroupResponse,
  ModifierOptionResponse,
  MenuTagResponse,
  MenuAllergenResponse,
} from "@pos/contracts";

const numberValue = (value: string | number | null | undefined): number =>
  value == null ? 0 : Number(value);

export const toModifierOptionResponse = (
  option: any,
): ModifierOptionResponse => ({
  id: option.id,
  modifierGroupId: option.modifierGroupId,
  name: option.name,
  additionalPrice: numberValue(option.additionalPrice),
  isAvailable: Boolean(option.isAvailable),
  computedAvailability: Boolean(option.computedAvailability),
  manualOverrideAvailability: option.manualOverrideAvailability ?? null,
  maxQuantity: option.maxQuantity,
  sortOrder: option.sortOrder,
  isDefault: Boolean(option.isDefault),
  replacesDefaultComponent: option.replacesDefaultComponent ?? null,
  variantPrices: (option.variantPrices ?? []).map((price: any) => ({
    id: price.id,
    variantId: price.variantId,
    additionalPrice: numberValue(price.additionalPrice),
  })),
});

export const toModifierGroupResponse = (group: any): ModifierGroupResponse => ({
  id: group.id,
  tenantId: group.tenantId,
  branchId: group.branchId ?? null,
  name: group.name,
  selectionType: group.selectionType,
  groupType: group.groupType ?? "ADDON",
  minSelections: group.minSelections,
  maxSelections: group.maxSelections ?? null,
  sortOrder: group.sortOrder,
  dependsOnOptionId: group.dependsOnOptionId ?? null,
  options: (group.options ?? []).map(toModifierOptionResponse),
});

export const toMenuTagResponse = (tag: any): MenuTagResponse => ({
  id: tag.id,
  tenantId: tag.tenantId,
  name: tag.name,
  color: tag.color ?? null,
});

export const toMenuAllergenResponse = (
  allergen: any,
): MenuAllergenResponse => ({
  id: allergen.id,
  name: allergen.name,
});
