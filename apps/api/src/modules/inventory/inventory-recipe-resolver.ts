import type { InventoryUnit } from "@pos/types";
import { ValidationError } from "@/core/errors";
import { inventoryRepository } from "./inventory.repository";
import {
  applicableRecipeRows,
  convertRecipeQuantity,
  recipeYieldFactor,
  weightRecipeScale,
  type ResolvedRawNeed,
} from "./inventory-recipe.engine";
import type { RecipeNeedItemInput } from "./inventory.types";

type RequiredRecipeRow = Awaited<
  ReturnType<typeof inventoryRepository.findRequiredRecipeLines>
>[number];

const resolveSubRecipeNeed = async (
  tenantId: string,
  branchId: string,
  subRecipeId: string,
  preparedQuantityNeeded: number,
  preparedUnit: InventoryUnit,
  depth = 1,
  path = new Set<string>(),
  subRecipeCache = new Map<
    string,
    Awaited<
      ReturnType<typeof inventoryRepository.findSubRecipeWithIngredients>
    > | null
  >(),
): Promise<ResolvedRawNeed[]> => {
  if (depth > 3)
    throw new ValidationError("Sub-recipe depth exceeds supported maximum");
  if (path.has(subRecipeId))
    throw new ValidationError("Circular sub-recipe reference detected");
  let subRecipe = subRecipeCache.get(subRecipeId);
  if (subRecipe === undefined) {
    subRecipe = await inventoryRepository.findSubRecipeWithIngredients(
      tenantId,
      subRecipeId,
    );
    subRecipeCache.set(subRecipeId, subRecipe ?? null);
  }
  if (!subRecipe) throw new ValidationError("Sub-recipe could not be resolved");
  if (subRecipe.branchId !== branchId) {
    throw new ValidationError(
      `Sub-recipe ${subRecipe.name ?? subRecipeId} is not compatible with the active branch`,
    );
  }
  const nextPath = new Set(path);
  nextPath.add(subRecipeId);
  const yieldQuantity = Math.max(Number(subRecipe.yieldQuantity), 0.000001);
  const normalizedPreparedQuantity = convertRecipeQuantity(
    preparedQuantityNeeded,
    preparedUnit,
    subRecipe.yieldUnit,
    `Sub-recipe ${subRecipe.name ?? subRecipeId}`,
  );
  const scale =
    normalizedPreparedQuantity /
    yieldQuantity /
    recipeYieldFactor(subRecipe.yieldPercent);
  const needs: ResolvedRawNeed[] = [];
  for (const ingredient of subRecipe.ingredients) {
    const quantity = Number(ingredient.quantityRequired) * scale;
    if (ingredient.inventoryItemId && ingredient.inventoryItem) {
      if (ingredient.inventoryItem.tenantId !== tenantId) {
        throw new ValidationError(
          `Sub-recipe ${subRecipe.name ?? subRecipeId} references inventory outside this tenant`,
        );
      }
      if (ingredient.inventoryItem.branchId !== branchId) {
        throw new ValidationError(
          `Sub-recipe ${subRecipe.name ?? subRecipeId} is not compatible with the active branch`,
        );
      }
      const neededQuantity = convertRecipeQuantity(
        quantity,
        ingredient.unit,
        ingredient.inventoryItem.unit,
        `Ingredient ${ingredient.inventoryItem.name}`,
      );
      needs.push({
        inventoryItemId: ingredient.inventoryItemId,
        name: ingredient.inventoryItem.name,
        currentStock: Number(ingredient.inventoryItem.currentStock),
        unit: ingredient.inventoryItem.unit,
        neededQuantity,
        costPerUnit: Number(ingredient.inventoryItem.costPerUnit),
      });
    } else if (ingredient.ingredientSubRecipeId) {
      needs.push(
        ...(await resolveSubRecipeNeed(
          tenantId,
          branchId,
          ingredient.ingredientSubRecipeId,
          quantity,
          ingredient.unit,
          depth + 1,
          nextPath,
          subRecipeCache,
        )),
      );
    }
  }
  return needs;
};

export const resolveOrderItemRecipeNeeds = async (
  tenantId: string,
  branchId: string,
  rows: RequiredRecipeRow[],
  item: RecipeNeedItemInput,
  requireRecipeDeductionEnabled = true,
  subRecipeCache = new Map<
    string,
    Awaited<
      ReturnType<typeof inventoryRepository.findSubRecipeWithIngredients>
    > | null
  >(),
): Promise<ResolvedRawNeed[]> => {
  const needs: ResolvedRawNeed[] = [];
  for (const { row, multiplier } of applicableRecipeRows(
    rows,
    item,
    requireRecipeDeductionEnabled,
  )) {
    const quantity =
      (Number(row.quantityRequired) *
        item.quantity *
        multiplier *
        weightRecipeScale(item.weightQuantity, item.weightUnit)) /
      recipeYieldFactor(row.yieldPercent);
    if (row.inventoryItemId && row.inventoryItem) {
      if (row.inventoryItem.branchId !== branchId) {
        throw new ValidationError(
          `Recipe ingredient ${row.inventoryItem.name} is not compatible with the active branch`,
        );
      }
      const neededQuantity = convertRecipeQuantity(
        quantity,
        row.unit,
        row.inventoryItem.unit,
        `Recipe ingredient ${row.inventoryItem.name}`,
      );
      needs.push({
        inventoryItemId: row.inventoryItemId,
        name: row.inventoryItem.name,
        currentStock: Number(row.inventoryItem.currentStock),
        unit: row.inventoryItem.unit,
        neededQuantity,
        costPerUnit: Number(row.inventoryItem.costPerUnit),
      });
    } else if (row.subRecipeId) {
      needs.push(
        ...(await resolveSubRecipeNeed(
          tenantId,
          branchId,
          row.subRecipeId,
          quantity,
          row.unit,
          1,
          new Set<string>(),
          subRecipeCache,
        )),
      );
    }
  }
  return needs;
};
