import type { SubRecipeResponse } from "@pos/contracts";

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
const summary = (row: any) =>
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
export const toSubRecipeResponse = (row: any): SubRecipeResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  branchId: row.branchId,
  name: row.name,
  yieldQuantity: numberValue(row.yieldQuantity),
  yieldUnit: row.yieldUnit,
  yieldPercent: row.yieldPercent == null ? null : numberValue(row.yieldPercent),
  ingredients: (row.ingredients ?? []).map((ingredient: any) => ({
    id: ingredient.id,
    subRecipeId: ingredient.subRecipeId,
    inventoryItemId: ingredient.inventoryItemId ?? null,
    ingredientSubRecipeId: ingredient.ingredientSubRecipeId ?? null,
    quantityRequired: numberValue(ingredient.quantityRequired),
    unit: ingredient.unit,
    inventoryItem: inventoryItem(ingredient.inventoryItem),
    ingredientSubRecipe: summary(ingredient.ingredientSubRecipe),
  })),
});
