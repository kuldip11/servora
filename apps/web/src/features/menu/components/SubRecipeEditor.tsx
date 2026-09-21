import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  FieldErrorText,
  FormErrorSummary,
  Input,
  Select,
} from "@pos/ui";
import type {
  InventoryItem,
  InventoryUnit,
  SubRecipe,
  SubRecipeInput,
} from "@pos/types";
import { notifyError } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  type SubRecipeIngredientDraft,
  validateSubRecipeForm,
} from "@/features/menu/helpers/sub-recipe-form";
import { INVENTORY_UNITS } from "@/features/menu/constants";

type Props = {
  open: boolean;
  inventory: InventoryItem[];
  subRecipes: SubRecipe[];
  isSaving: boolean;
  onToggle: () => void;
  onCreate: (
    payload: SubRecipeInput,
    onError: (error: unknown) => void,
    onSuccessReset: () => void,
  ) => void;
};

export const SubRecipeEditor = ({
  open,
  inventory,
  subRecipes,
  isSaving,
  onToggle,
  onCreate,
}: Props) => {
  const [name, setName] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [yieldUnit, setYieldUnit] = useState<InventoryUnit>("KG");
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
    if (firstInventory) {
      formErrors.clearFieldError("ingredients");
      setIngredients((rows) => [
        ...rows,
        {
          clientKey: crypto.randomUUID(),
          source: "inventory",
          sourceId: firstInventory.id,
          quantity: "1",
          unit: firstInventory.unit,
        },
      ]);
      return;
    }
    const firstSubRecipe = subRecipes[0];
    if (firstSubRecipe) {
      formErrors.clearFieldError("ingredients");
      setIngredients((rows) => [
        ...rows,
        {
          clientKey: crypto.randomUUID(),
          source: "sub",
          sourceId: firstSubRecipe.id,
          quantity: "1",
          unit: firstSubRecipe.yieldUnit,
        },
      ]);
      return;
    }
    notifyError(undefined, "Add raw inventory before creating a sub-recipe");
  };

  if (!open) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <FormErrorSummary messages={formErrors.formErrorMessages} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
          label="Name"
          required
          value={name}
          error={formErrors.fieldError("name", clientErrors.name)}
          onBlur={() => formErrors.touchField("name")}
          onChange={(event) => {
            formErrors.clearFieldError("name");
            setName(event.target.value);
          }}
          placeholder="House tomato sauce"
        />
        <Input
          label="Batch yield"
          required
          type="number"
          min="0.001"
          step="0.001"
          value={yieldQuantity}
          error={formErrors.fieldError(
            "yieldQuantity",
            clientErrors.yieldQuantity,
          )}
          onBlur={() => formErrors.touchField("yieldQuantity")}
          onChange={(event) => {
            formErrors.clearFieldError("yieldQuantity");
            setYieldQuantity(event.target.value);
          }}
        />
        <Select
          label="Yield unit"
          required
          value={yieldUnit}
          error={formErrors.fieldErrors.yieldUnit}
          onChange={(value) => {
            formErrors.clearFieldError("yieldUnit");
            setYieldUnit(value as InventoryUnit);
          }}
          options={INVENTORY_UNITS.map((unit) => ({
            value: unit,
            label: unit,
          }))}
        />
        <Input
          label="Yield % (optional)"
          type="number"
          min="0.01"
          max="100"
          step="0.01"
          value={yieldPercent}
          error={formErrors.fieldError(
            "yieldPercent",
            clientErrors.yieldPercent,
          )}
          onBlur={() => formErrors.touchField("yieldPercent")}
          onChange={(event) => {
            formErrors.clearFieldError("yieldPercent");
            setYieldPercent(event.target.value);
          }}
          placeholder="100"
        />
      </div>

      {formErrors.clientError("ingredients", clientErrors.ingredients) ? (
        <FieldErrorText
          message={formErrors.clientError(
            "ingredients",
            clientErrors.ingredients,
          )}
        />
      ) : null}

      <div className="space-y-2">
        {ingredients.map((row, index) => {
          const sourceKey = `ingredients.${index}.sourceId`;
          const quantityKey = `ingredients.${index}.quantity`;
          const sourceError =
            formErrors.fieldErrors[`ingredients.${index}.inventoryItemId`] ??
            formErrors.fieldErrors[
              `ingredients.${index}.ingredientSubRecipeId`
            ] ??
            formErrors.clientError(sourceKey, clientErrors[sourceKey]);
          const quantityError = formErrors.fieldError(
            quantityKey,
            clientErrors[quantityKey],
          );
          return (
            <div
              key={row.clientKey}
              className="grid items-start gap-2 sm:grid-cols-[8rem_1fr_8rem_8rem_auto]"
            >
              <Select
                aria-label={`Source type for sub-recipe row ${index + 1}`}
                value={row.source}
                onChange={(value) => {
                  formErrors.clearFieldError(
                    `ingredients.${index}.inventoryItemId`,
                  );
                  formErrors.clearFieldError(
                    `ingredients.${index}.ingredientSubRecipeId`,
                  );
                  const source = value as "inventory" | "sub";
                  const first =
                    source === "inventory" ? inventory[0] : subRecipes[0];
                  setIngredients((previous) =>
                    previous.map((entry, rowIndex) =>
                      rowIndex === index
                        ? {
                            ...entry,
                            source,
                            sourceId: first?.id ?? "",
                            unit:
                              source === "inventory"
                                ? (inventory[0]?.unit ?? entry.unit)
                                : (subRecipes[0]?.yieldUnit ?? entry.unit),
                          }
                        : entry,
                    ),
                  );
                }}
                options={[
                  { value: "inventory", label: "Raw item" },
                  { value: "sub", label: "Sub-recipe" },
                ]}
              />
              <div>
                <Select
                  aria-label={`Source for sub-recipe row ${index + 1}`}
                  value={row.sourceId}
                  error={sourceError}
                  onBlur={() => formErrors.touchField(sourceKey)}
                  onChange={(sourceId) => {
                    formErrors.clearFieldError(
                      `ingredients.${index}.inventoryItemId`,
                    );
                    formErrors.clearFieldError(
                      `ingredients.${index}.ingredientSubRecipeId`,
                    );
                    const nextUnit =
                      row.source === "inventory"
                        ? inventory.find((item) => item.id === sourceId)?.unit
                        : subRecipes.find((item) => item.id === sourceId)
                            ?.yieldUnit;
                    setIngredients((previous) =>
                      previous.map((entry, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...entry,
                              sourceId,
                              ...(nextUnit ? { unit: nextUnit } : {}),
                            }
                          : entry,
                      ),
                    );
                  }}
                  options={(row.source === "inventory"
                    ? inventory
                    : subRecipes
                  ).map((item) => ({ value: item.id, label: item.name }))}
                />
                <FieldErrorText message={sourceError} />
              </div>
              <div>
                <input
                  aria-label={`Sub-recipe ingredient quantity ${index + 1}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={row.quantity}
                  aria-invalid={quantityError ? true : undefined}
                  onBlur={() => formErrors.touchField(quantityKey)}
                  onChange={(event) => {
                    formErrors.clearFieldError(quantityKey);
                    setIngredients((previous) =>
                      previous.map((entry, rowIndex) =>
                        rowIndex === index
                          ? { ...entry, quantity: event.target.value }
                          : entry,
                      ),
                    );
                  }}
                  className="w-full rounded-md border border-border px-2 py-2 text-xs"
                />
                <FieldErrorText message={quantityError} />
              </div>
              <Select
                aria-label={`Unit for sub-recipe row ${index + 1}`}
                value={row.unit}
                onChange={(value) =>
                  setIngredients((previous) =>
                    previous.map((entry, rowIndex) =>
                      rowIndex === index
                        ? { ...entry, unit: value as InventoryUnit }
                        : entry,
                    ),
                  )
                }
                options={INVENTORY_UNITS.map((unit) => ({
                  value: unit,
                  label: unit,
                }))}
              />
              <button
                type="button"
                onClick={() =>
                  setIngredients((previous) =>
                    previous.filter((_, rowIndex) => rowIndex !== index),
                  )
                }
                className="p-2 text-text-disabled hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={addIngredient}>
          Add ingredient
        </Button>
        <Button
          size="sm"
          onClick={() => {
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
          }}
          loading={isSaving}
          disabled={isSaving}
        >
          Create component
        </Button>
      </div>
    </div>
  );
};
