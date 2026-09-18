import type { RecipeResponse } from "@pos/contracts";

const numberValue = (value: string | number | null | undefined): number =>
  value == null ? 0 : Number(value);
const inventoryItem = (item: any) =>
  item
    ? {
        id: item.id,
        tenantId: item.tenantId,
        branchId: item.branchId,
        name: item.name,
        unit: item.unit,
        currentStock: numberValue(item.currentStock),
        minimumStock: numberValue(item.minimumStock),
        reorderPoint: numberValue(item.reorderPoint),
        costPerUnit: numberValue(item.costPerUnit),
        isActive: Boolean(item.isActive),
      }
    : null;
const subRecipe = (row: any) =>
  row
    ? {
        id: row.id,
        tenantId: row.tenantId,
        branchId: row.branchId,
        name: row.name,
        yieldQuantity: numberValue(row.yieldQuantity),
        yieldUnit: row.yieldUnit,
        yieldPercent:
          row.yieldPercent == null ? null : numberValue(row.yieldPercent),
      }
    : null;

export const toRecipeResponse = (row: any): RecipeResponse => ({
  id: row.id,
  menuItemId: row.menuItemId,
  inventoryItemId: row.inventoryItemId ?? null,
  subRecipeId: row.subRecipeId ?? null,
  variantId: row.variantId ?? null,
  modifierOptionId: row.modifierOptionId ?? null,
  quantityRequired: numberValue(row.quantityRequired),
  unit: row.unit,
  yieldPercent: row.yieldPercent == null ? null : numberValue(row.yieldPercent),
  isOptional: Boolean(row.isOptional),
  inventoryItem: inventoryItem(row.inventoryItem),
  subRecipe: subRecipe(row.subRecipe),
  variant: row.variant ? { id: row.variant.id, name: row.variant.name } : null,
  modifierOption: row.modifierOption
    ? { id: row.modifierOption.id, name: row.modifierOption.name }
    : null,
});
