import type { InventoryUnit } from "@pos/types";

export type SubRecipeIngredientDraft = {
  clientKey: string;
  source: "inventory" | "sub";
  sourceId: string;
  quantity: string;
  unit: InventoryUnit;
};

export const validateSubRecipeForm = (input: {
  name: string;
  yieldQuantity: string;
  yieldPercent: string;
  ingredients: readonly SubRecipeIngredientDraft[];
}) => {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const yieldQuantity = Number(input.yieldQuantity);
  const yieldPercent = input.yieldPercent ? Number(input.yieldPercent) : null;

  if (!name) errors.name = "Name is required";
  else if (name.length > 200)
    errors.name = "Name must be 200 characters or fewer";

  if (!Number.isFinite(yieldQuantity) || yieldQuantity <= 0)
    errors.yieldQuantity = "Batch yield must be greater than 0";

  if (
    yieldPercent !== null &&
    (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 100)
  )
    errors.yieldPercent =
      "Yield percent must be greater than 0 and at most 100";

  if (!input.ingredients.length)
    errors.ingredients = "Add at least one ingredient";

  input.ingredients.forEach((row, index) => {
    if (!row.sourceId)
      errors[`ingredients.${index}.sourceId`] = "Choose an ingredient";
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0)
      errors[`ingredients.${index}.quantity`] =
        "Quantity must be greater than 0";
  });

  return errors;
};
