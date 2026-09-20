import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  FieldErrorText,
  FormErrorSummary,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import type { InventoryUnit } from "@pos/types";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import {
  useSubRecipes,
  subRecipeQueryKey,
} from "@/features/menu/hooks/useSubRecipes";
import { menuSubRecipesService } from "@/features/menu/services/menu-sub-recipes.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  type SubRecipeIngredientDraft,
  validateSubRecipeForm,
} from "@/features/menu/helpers/sub-recipe-form";
import { INVENTORY_UNITS } from "@/features/menu/constants";

export const SubRecipeManager = () => {
  const queryClient = useQueryClient();
  const subRecipesQuery = useSubRecipes();
  const inventoryQuery = useInventoryItems({ limit: 100 });
  const subRecipes = subRecipesQuery.data;
  const inventory = inventoryQuery.data?.items;
  const [open, setOpen] = useState(false);
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

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: subRecipeQueryKey() });
  const create = useMutation({
    mutationFn: menuSubRecipesService.create,
    onSuccess: async () => {
      formErrors.resetValidation();
      await refresh();
      setName("");
      setYieldQuantity("1");
      setYieldPercent("");
      setIngredients([]);
      setOpen(false);
      notifySuccess("Sub-recipe created");
    },
  });
  const remove = useMutation({
    mutationFn: menuSubRecipesService.remove,
    onSuccess: async () => {
      await refresh();
      notifySuccess("Sub-recipe deleted");
    },
    onError: (error) => notifyError(error, "Could not delete sub-recipe"),
  });

  const addIngredient = () => {
    const firstInventory = inventory?.[0];
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
    const firstSubRecipe = subRecipes?.[0];
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

  const save = () => {
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
    create.mutate(
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
      {
        onError: (error) =>
          formErrors.handleApiError(
            error,
            knownFields,
            "Could not create sub-recipe",
          ),
      },
    );
  };

  const dependencyFailed =
    (subRecipesQuery.isError && !subRecipesQuery.data) ||
    (inventoryQuery.isError && !inventoryQuery.data);
  if (dependencyFailed) {
    return (
      <QueryErrorState
        title="Unable to load recipe components"
        description="Sub-recipes or inventory could not be loaded. Retry before creating a prepared component so missing ingredients are not treated as an empty catalog."
        onRetry={() =>
          void Promise.all([
            subRecipesQuery.refetch(),
            inventoryQuery.refetch(),
          ])
        }
        isRetrying={subRecipesQuery.isFetching || inventoryQuery.isFetching}
      />
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Prepared components / sub-recipes
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Model sauces, doughs and prep batches once, then reuse them inside
            dish recipes.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={subRecipesQuery.isLoading || inventoryQuery.isLoading}
          onClick={() => {
            formErrors.resetValidation();
            setOpen((value) => !value);
          }}
        >
          <Plus className="h-4 w-4" /> New sub-recipe
        </Button>
      </div>

      {(subRecipesQuery.isError || inventoryQuery.isError) && (
        <div className="mt-3">
          <StaleDataBanner
            message="Recipe component data could not be refreshed. Showing the latest cached inventory and sub-recipes."
            onRetry={() =>
              void Promise.all([
                subRecipesQuery.refetch(),
                inventoryQuery.refetch(),
              ])
            }
            isRetrying={subRecipesQuery.isFetching || inventoryQuery.isFetching}
          />
        </div>
      )}

      {!!subRecipes?.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {subRecipes.map((row) => (
            <span
              key={row.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs"
            >
              <strong>{row.name}</strong>
              <span className="text-text-secondary">
                {row.yieldQuantity} {row.yieldUnit}
                {row.yieldPercent ? ` · ${row.yieldPercent}% yield` : ""}
              </span>
              <button
                type="button"
                aria-label={`Delete ${row.name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(row.id)}
                className="text-text-disabled hover:text-danger disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
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
              onChange={(event) => {
                formErrors.clearFieldError("yieldUnit");
                setYieldUnit(event.target.value as InventoryUnit);
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
                formErrors.fieldErrors[
                  `ingredients.${index}.inventoryItemId`
                ] ??
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
                  <select
                    value={row.source}
                    onChange={(event) => {
                      formErrors.clearFieldError(
                        `ingredients.${index}.inventoryItemId`,
                      );
                      formErrors.clearFieldError(
                        `ingredients.${index}.ingredientSubRecipeId`,
                      );
                      const source = event.target.value as "inventory" | "sub";
                      const first =
                        source === "inventory"
                          ? inventory?.[0]
                          : subRecipes?.[0];
                      setIngredients((previous) =>
                        previous.map((entry, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...entry,
                                source,
                                sourceId: first?.id ?? "",
                                unit:
                                  source === "inventory"
                                    ? (inventory?.[0]?.unit ?? entry.unit)
                                    : (subRecipes?.[0]?.yieldUnit ??
                                      entry.unit),
                              }
                            : entry,
                        ),
                      );
                    }}
                    className="rounded-md border border-border bg-surface px-2 py-2 text-xs"
                  >
                    <option value="inventory">Raw item</option>
                    <option value="sub">Sub-recipe</option>
                  </select>
                  <div>
                    <select
                      value={row.sourceId}
                      aria-invalid={sourceError ? true : undefined}
                      onBlur={() => formErrors.touchField(sourceKey)}
                      onChange={(event) => {
                        formErrors.clearFieldError(
                          `ingredients.${index}.inventoryItemId`,
                        );
                        formErrors.clearFieldError(
                          `ingredients.${index}.ingredientSubRecipeId`,
                        );
                        const sourceId = event.target.value;
                        const nextUnit =
                          row.source === "inventory"
                            ? inventory?.find((item) => item.id === sourceId)
                                ?.unit
                            : subRecipes?.find((item) => item.id === sourceId)
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
                      className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs"
                    >
                      {row.source === "inventory"
                        ? (inventory ?? []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))
                        : (subRecipes ?? []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                    </select>
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
                  <select
                    value={row.unit}
                    onChange={(event) =>
                      setIngredients((previous) =>
                        previous.map((entry, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...entry,
                                unit: event.target.value as InventoryUnit,
                              }
                            : entry,
                        ),
                      )
                    }
                    className="rounded-md border border-border bg-surface px-2 py-2 text-xs"
                  >
                    {INVENTORY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
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
              onClick={save}
              loading={create.isPending}
              disabled={create.isPending}
            >
              Create component
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
