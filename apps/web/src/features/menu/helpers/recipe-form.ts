import type { InventoryUnit } from "@pos/types";

export type RecipeDraftRow = {
  clientKey: string;
  sourceType: "inventory" | "sub-recipe";
  inventoryItemId: string;
  subRecipeId: string;
  scopeType: "base" | "variant" | "modifier";
  variantId: string;
  modifierOptionId: string;
  quantity: string;
  unit: InventoryUnit;
  yieldPercent: string;
  isOptional: boolean;
};

export type RecipeRowValidation = {
  quantity?: string;
  yieldPercent?: string;
  source?: string;
  scope?: string;
};

export const validateRecipeRows = (
  rows: readonly RecipeDraftRow[],
): Record<number, RecipeRowValidation> => {
  const errors: Record<number, RecipeRowValidation> = {};

  rows.forEach((row, index) => {
    const rowErrors: RecipeRowValidation = {};
    const quantity = Number(row.quantity);
    const yieldPercent = row.yieldPercent ? Number(row.yieldPercent) : null;

    if (
      (row.sourceType === "inventory" && !row.inventoryItemId) ||
      (row.sourceType === "sub-recipe" && !row.subRecipeId)
    ) {
      rowErrors.source = "Choose an ingredient source";
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      rowErrors.quantity = "Quantity must be greater than 0";
    }
    if (
      yieldPercent !== null &&
      (!Number.isFinite(yieldPercent) ||
        yieldPercent <= 0 ||
        yieldPercent > 100)
    ) {
      rowErrors.yieldPercent = "Yield must be greater than 0 and at most 100";
    }
    if (row.scopeType === "variant" && !row.variantId) {
      rowErrors.scope = "Choose a variant";
    }
    if (row.scopeType === "modifier" && !row.modifierOptionId) {
      rowErrors.scope = "Choose a modifier option";
    }

    if (Object.keys(rowErrors).length) errors[index] = rowErrors;
  });

  return errors;
};
