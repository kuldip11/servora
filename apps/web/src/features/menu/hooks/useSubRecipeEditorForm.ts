import { useMemo, useState } from "react";
import type {
  InventoryItemDto as InventoryItem,
  InventoryUnitDto,
  SubRecipeDto,
  SubRecipeInput,
} from "@pos/api-client";
import { notifyError } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  type SubRecipeIngredientDraft,
  validateSubRecipeForm,
} from "@/features/menu/helpers/sub-recipe-form";

type Input = {
  inventory: InventoryItem[];
  subRecipes: SubRecipeDto[];
  onCreate: (
    payload: SubRecipeInput,
    onError: (error: unknown) => void,
    onSuccessReset: () => void,
  ) => void;
};

export const useSubRecipeEditorForm = ({
  inventory,
  subRecipes,
  onCreate,
}: Input) => {
  const [name, setName] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [yieldUnit, setYieldUnit] = useState<InventoryUnitDto>("KG");
  const [yieldPercent, setYieldPercent] = useState("");
  const [ingredients, setIngredients] = useState<SubRecipeIngredientDraft[]>(
    [],
  );
  const formErrors = useLocalFormApiErrors();
  const clientErrors = useMemo(
    () =>
      validateSubRecipeForm({ name, yieldQuantity, yieldPercent, ingredients }),
    [ingredients, name, yieldPercent, yieldQuantity],
  );

  const reset = () => {
    formErrors.resetValidation();
    setName("");
    setYieldQuantity("1");
    setYieldPercent("");
    setIngredients([]);
  };

  const addIngredient = () => {
    const firstInventory = inventory[0];
    const firstSubRecipe = subRecipes[0];
    const first = firstInventory ?? firstSubRecipe;
    if (!first) {
      notifyError(undefined, "Add raw inventory before creating a sub-recipe");
      return;
    }
    formErrors.clearFieldError("ingredients");
    setIngredients((rows) => [
      ...rows,
      {
        clientKey: crypto.randomUUID(),
        source: firstInventory ? "inventory" : "sub",
        sourceId: first.id,
        quantity: "1",
        unit: firstInventory ? firstInventory.unit : firstSubRecipe!.yieldUnit,
      },
    ]);
  };

  const updateIngredient = (
    index: number,
    patch: Partial<SubRecipeIngredientDraft>,
  ) =>
    setIngredients((previous) =>
      previous.map((entry, rowIndex) =>
        rowIndex === index ? { ...entry, ...patch } : entry,
      ),
    );

  const changeIngredientSource = (
    index: number,
    source: "inventory" | "sub",
  ) => {
    formErrors.clearFieldError(`ingredients.${index}.inventoryItemId`);
    formErrors.clearFieldError(`ingredients.${index}.ingredientSubRecipeId`);
    const first = source === "inventory" ? inventory[0] : subRecipes[0];
    updateIngredient(index, {
      source,
      sourceId: first?.id ?? "",
      ...(first
        ? {
            unit:
              source === "inventory"
                ? inventory[0]!.unit
                : subRecipes[0]!.yieldUnit,
          }
        : {}),
    });
  };

  const changeIngredientSourceId = (
    index: number,
    row: SubRecipeIngredientDraft,
    sourceId: string,
  ) => {
    formErrors.clearFieldError(`ingredients.${index}.inventoryItemId`);
    formErrors.clearFieldError(`ingredients.${index}.ingredientSubRecipeId`);
    const nextUnit =
      row.source === "inventory"
        ? inventory.find((item) => item.id === sourceId)?.unit
        : subRecipes.find((item) => item.id === sourceId)?.yieldUnit;
    updateIngredient(index, {
      sourceId,
      ...(nextUnit ? { unit: nextUnit } : {}),
    });
  };

  const removeIngredient = (index: number) =>
    setIngredients((previous) =>
      previous.filter((_, rowIndex) => rowIndex !== index),
    );

  const submit = () => {
    formErrors.markSubmitted();
    formErrors.clearErrors();
    if (Object.keys(clientErrors).length) return;
    const knownFields = [
      "name",
      "yieldQuantity",
      "yieldUnit",
      "yieldPercent",
      ...ingredients.flatMap((_, index) => [
        `ingredients.${index}.inventoryItemId`,
        `ingredients.${index}.ingredientSubRecipeId`,
        `ingredients.${index}.quantity`,
        `ingredients.${index}.unit`,
      ]),
    ];
    onCreate(
      {
        name: name.trim(),
        yieldQuantity: Number(yieldQuantity),
        yieldUnit,
        yieldPercent: yieldPercent ? Number(yieldPercent) : null,
        ingredients: ingredients.map((row) => ({
          ...(row.source === "inventory"
            ? { inventoryItemId: row.sourceId }
            : { ingredientSubRecipeId: row.sourceId }),
          quantity: Number(row.quantity),
          unit: row.unit,
        })),
      },
      (error) =>
        formErrors.handleApiError(
          error,
          knownFields,
          "Could not create sub-recipe",
        ),
      reset,
    );
  };

  return {
    name,
    yieldQuantity,
    yieldUnit,
    yieldPercent,
    ingredients,
    formErrors,
    clientErrors,
    setName,
    setYieldQuantity,
    setYieldUnit,
    setYieldPercent,
    addIngredient,
    updateIngredient,
    changeIngredientSource,
    changeIngredientSourceId,
    removeIngredient,
    submit,
  };
};

export type SubRecipeEditorForm = ReturnType<typeof useSubRecipeEditorForm>;
