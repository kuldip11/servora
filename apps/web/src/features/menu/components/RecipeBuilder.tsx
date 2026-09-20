import { useEffect, useMemo, useState } from "react";
import { Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  FieldErrorText,
  FormErrorSummary,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { notifyError } from "@/shared/lib/notify";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import { useMenuItemRecipe } from "@/features/menu/hooks/useMenuItemRecipe";
import { useSaveRecipe } from "@/features/menu/hooks/useSaveRecipe";
import { useSubRecipes } from "@/features/menu/hooks/useSubRecipes";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  type RecipeDraftRow,
  validateRecipeRows,
} from "@/features/menu/helpers/recipe-form";
import type { InventoryItem, InventoryUnit, MenuItem } from "@pos/types";

const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: "KG", label: "kg" },
  { value: "GRAMS", label: "g" },
  { value: "LITERS", label: "L" },
  { value: "ML", label: "ml" },
  { value: "PIECES", label: "pcs" },
  { value: "PACKETS", label: "packets" },
];

export const RecipeBuilder = ({ item }: { item: MenuItem }) => {
  const itemId = item.id;
  const [rows, setRows] = useState<RecipeDraftRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const recipeQuery = useMenuItemRecipe(itemId);
  const inventoryQuery = useInventoryItems({ limit: 100 });
  const subRecipesQuery = useSubRecipes();
  const saveMutation = useSaveRecipe(itemId);
  const formErrors = useLocalFormApiErrors();
  const inventoryItems = inventoryQuery.data?.items;
  const subRecipes = subRecipesQuery.data;
  const modifierOptions = (item.modifierGroupLinks ?? []).flatMap((link) =>
    link.group.options.map((option) => ({
      ...option,
      groupName: link.group.name,
    })),
  );
  const rowErrors = useMemo(() => validateRecipeRows(rows), [rows]);
  const requiredDependencyFailed =
    (recipeQuery.isError && !recipeQuery.data) ||
    (inventoryQuery.isError && !inventoryQuery.data) ||
    (subRecipesQuery.isError && !subRecipesQuery.data);
  const requiredDependencyLoading =
    recipeQuery.isLoading ||
    inventoryQuery.isLoading ||
    subRecipesQuery.isLoading;

  useEffect(() => {
    if (recipeQuery.data && !dirty) {
      setRows(
        recipeQuery.data.map((row) => ({
          clientKey: row.id ?? crypto.randomUUID(),
          sourceType: row.subRecipeId ? "sub-recipe" : "inventory",
          inventoryItemId: row.inventoryItemId ?? "",
          subRecipeId: row.subRecipeId ?? "",
          scopeType: row.variantId
            ? "variant"
            : row.modifierOptionId
              ? "modifier"
              : "base",
          variantId: row.variantId ?? "",
          modifierOptionId: row.modifierOptionId ?? "",
          quantity: String(row.quantityRequired),
          unit: row.unit,
          yieldPercent:
            row.yieldPercent == null ? "" : String(row.yieldPercent),
          isOptional: row.isOptional,
        })),
      );
    }
  }, [recipeQuery.data, dirty]);

  const handleSave = () => {
    formErrors.markSubmitted();
    formErrors.clearErrors();
    if (Object.keys(rowErrors).length) return;
    const ingredients = rows.map((row) => ({
      inventoryItemId:
        row.sourceType === "inventory" ? row.inventoryItemId : null,
      subRecipeId: row.sourceType === "sub-recipe" ? row.subRecipeId : null,
      variantId: row.scopeType === "variant" ? row.variantId : null,
      modifierOptionId:
        row.scopeType === "modifier" ? row.modifierOptionId : null,
      quantity: Number(row.quantity),
      unit: row.unit,
      yieldPercent: row.yieldPercent ? Number(row.yieldPercent) : null,
      isOptional: row.isOptional,
    }));
    const knownFields = rows.flatMap((_, index) => [
      `ingredients.${index}.inventoryItemId`,
      `ingredients.${index}.subRecipeId`,
      `ingredients.${index}.variantId`,
      `ingredients.${index}.modifierOptionId`,
      `ingredients.${index}.quantity`,
      `ingredients.${index}.unit`,
      `ingredients.${index}.yieldPercent`,
      `ingredients.${index}.isOptional`,
    ]);
    saveMutation.mutate(ingredients, {
      onSuccess: () => setDirty(false),
      onError: (error) =>
        formErrors.handleApiError(error, knownFields, "Failed to save recipe"),
    });
  };

  const updateRow = (index: number, patch: Partial<RecipeDraftRow>) => {
    const serverFieldsByDraftField: Partial<
      Record<keyof RecipeDraftRow, string[]>
    > = {
      sourceType: [
        `ingredients.${index}.inventoryItemId`,
        `ingredients.${index}.subRecipeId`,
      ],
      inventoryItemId: [`ingredients.${index}.inventoryItemId`],
      subRecipeId: [`ingredients.${index}.subRecipeId`],
      scopeType: [
        `ingredients.${index}.variantId`,
        `ingredients.${index}.modifierOptionId`,
      ],
      variantId: [`ingredients.${index}.variantId`],
      modifierOptionId: [`ingredients.${index}.modifierOptionId`],
      quantity: [`ingredients.${index}.quantity`],
      unit: [`ingredients.${index}.unit`],
      yieldPercent: [`ingredients.${index}.yieldPercent`],
      isOptional: [`ingredients.${index}.isOptional`],
    };
    for (const key of Object.keys(patch) as (keyof RecipeDraftRow)[]) {
      for (const field of serverFieldsByDraftField[key] ?? []) {
        formErrors.clearFieldError(field);
      }
    }
    setDirty(true);
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  };
  const removeRow = (index: number) => {
    setDirty(true);
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };
  const addRow = () => {
    const first = inventoryItems?.[0];
    if (!first && !subRecipes?.length) {
      notifyError(undefined, "Add an inventory item or sub-recipe first");
      return;
    }
    setDirty(true);
    setRows((current) => [
      ...current,
      {
        clientKey: crypto.randomUUID(),
        sourceType: first ? "inventory" : "sub-recipe",
        inventoryItemId: first?.id ?? "",
        subRecipeId: first ? "" : (subRecipes?.[0]?.id ?? ""),
        scopeType: "base",
        variantId: "",
        modifierOptionId: "",
        quantity: "1",
        unit: first?.unit ?? subRecipes?.[0]?.yieldUnit ?? "PIECES",
        yieldPercent: "",
        isOptional: false,
      },
    ]);
  };

  if (requiredDependencyFailed) {
    return (
      <QueryErrorState
        title="Unable to load recipe dependencies"
        description="The current recipe, inventory, or sub-recipes could not be loaded. Retry before editing the recipe so missing ingredients are not treated as empty data."
        onRetry={() =>
          void Promise.all([
            recipeQuery.refetch(),
            inventoryQuery.refetch(),
            subRecipesQuery.refetch(),
          ])
        }
        isRetrying={
          recipeQuery.isFetching ||
          inventoryQuery.isFetching ||
          subRecipesQuery.isFetching
        }
      />
    );
  }

  const invMap = new Map<string, InventoryItem>(
    (inventoryItems ?? []).map((inventoryItem) => [
      inventoryItem.id,
      inventoryItem,
    ]),
  );

  return (
    <div className="space-y-2">
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-text-primary">
            Recipe ingredients
          </span>
          <p className="text-xs text-text-disabled">
            Scope raw ingredients or prepared components to the base item, a
            variant, or a modifier.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={
            !dirty ||
            saveMutation.isPending ||
            requiredDependencyLoading ||
            Object.keys(rowErrors).length > 0
          }
          className="text-xs font-medium text-primary hover:text-primary-hover disabled:text-text-disabled"
        >
          {saveMutation.isPending ? "Saving…" : dirty ? "Save recipe" : "Saved"}
        </button>
      </div>

      {(recipeQuery.isError ||
        inventoryQuery.isError ||
        subRecipesQuery.isError) && (
        <StaleDataBanner
          message="Recipe dependencies could not be refreshed. Showing the latest cached recipe and ingredient data."
          onRetry={() =>
            void Promise.all([
              recipeQuery.refetch(),
              inventoryQuery.refetch(),
              subRecipesQuery.refetch(),
            ])
          }
          isRetrying={
            recipeQuery.isFetching ||
            inventoryQuery.isFetching ||
            subRecipesQuery.isFetching
          }
        />
      )}
      <FormErrorSummary messages={formErrors.formErrorMessages} />

      {requiredDependencyLoading ? (
        <p className="text-xs text-text-disabled">Loading…</p>
      ) : (
        <div className="space-y-3">
          {rows.length > 0 ? (
            <div className="hidden space-y-1 md:block" aria-hidden="true">
              <div className="grid gap-2 px-3 text-xs font-medium text-text-secondary md:grid-cols-[8rem_1fr_8rem_7rem_auto]">
                <span>
                  Source type <span className="text-danger">*</span>
                </span>
                <span>
                  Ingredient <span className="text-danger">*</span>
                </span>
                <span>
                  Quantity <span className="text-danger">*</span>
                </span>
                <span>
                  Unit <span className="text-danger">*</span>
                </span>
                <span />
              </div>
              <div className="grid gap-2 px-3 text-xs font-medium text-text-secondary md:grid-cols-[8rem_1fr_8rem_auto_auto]">
                <span>
                  Scope <span className="text-danger">*</span>
                </span>
                <span>Scope target</span>
                <span>Yield %</span>
                <span>Optional</span>
                <span />
              </div>
            </div>
          ) : null}
          {rows.map((row, index) => {
            const inventoryItem = invMap.get(row.inventoryItemId);
            const short =
              row.sourceType === "inventory" &&
              inventoryItem &&
              Number(row.quantity || "0") > inventoryItem.currentStock;
            const quantityError =
              formErrors.fieldErrors[`ingredients.${index}.quantity`] ??
              formErrors.clientError(
                `${row.clientKey}.quantity`,
                rowErrors[index]?.quantity,
              );
            const yieldError =
              formErrors.fieldErrors[`ingredients.${index}.yieldPercent`] ??
              formErrors.clientError(
                `${row.clientKey}.yieldPercent`,
                rowErrors[index]?.yieldPercent,
              );
            const sourceError =
              formErrors.fieldErrors[`ingredients.${index}.inventoryItemId`] ??
              formErrors.fieldErrors[`ingredients.${index}.subRecipeId`] ??
              formErrors.clientError(
                `${row.clientKey}.source`,
                rowErrors[index]?.source,
              );
            const scopeError =
              formErrors.fieldErrors[`ingredients.${index}.variantId`] ??
              formErrors.fieldErrors[`ingredients.${index}.modifierOptionId`] ??
              formErrors.clientError(
                `${row.clientKey}.scope`,
                rowErrors[index]?.scope,
              );

            return (
              <div
                key={row.clientKey}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="grid gap-2 md:grid-cols-[8rem_1fr_8rem_7rem_auto]">
                  <select
                    value={row.sourceType}
                    aria-required="true"
                    aria-label={`Source type for recipe row ${index + 1}`}
                    onChange={(event) => {
                      const sourceType = event.target
                        .value as RecipeDraftRow["sourceType"];
                      const firstInventory = inventoryItems?.[0];
                      const firstSubRecipe = subRecipes?.[0];
                      updateRow(index, {
                        sourceType,
                        inventoryItemId:
                          sourceType === "inventory"
                            ? (firstInventory?.id ?? "")
                            : "",
                        subRecipeId:
                          sourceType === "sub-recipe"
                            ? (firstSubRecipe?.id ?? "")
                            : "",
                        unit:
                          sourceType === "inventory"
                            ? (firstInventory?.unit ?? row.unit)
                            : (firstSubRecipe?.yieldUnit ?? row.unit),
                      });
                    }}
                    className="rounded-md border border-border bg-surface px-2 py-2 text-sm"
                  >
                    <option value="inventory">Raw item</option>
                    <option value="sub-recipe">Sub-recipe</option>
                  </select>
                  <div>
                    {row.sourceType === "inventory" ? (
                      <select
                        value={row.inventoryItemId}
                        aria-required="true"
                        aria-label={`Ingredient for recipe row ${index + 1}`}
                        aria-invalid={sourceError ? true : undefined}
                        onBlur={() =>
                          formErrors.touchField(`${row.clientKey}.source`)
                        }
                        onChange={(event) => {
                          const next = inventoryItems?.find(
                            (candidate) => candidate.id === event.target.value,
                          );
                          updateRow(index, {
                            inventoryItemId: event.target.value,
                            ...(next ? { unit: next.unit } : {}),
                          });
                        }}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {(inventoryItems ?? []).map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={row.subRecipeId}
                        aria-required="true"
                        aria-label={`Sub-recipe for recipe row ${index + 1}`}
                        aria-invalid={sourceError ? true : undefined}
                        onBlur={() =>
                          formErrors.touchField(`${row.clientKey}.source`)
                        }
                        onChange={(event) => {
                          const next = subRecipes?.find(
                            (candidate) => candidate.id === event.target.value,
                          );
                          updateRow(index, {
                            subRecipeId: event.target.value,
                            ...(next ? { unit: next.yieldUnit } : {}),
                          });
                        }}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                      >
                        {(subRecipes ?? []).map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <FieldErrorText message={sourceError} />
                  </div>
                  <div>
                    <input
                      type="number"
                      aria-required="true"
                      min="0.001"
                      step="0.001"
                      value={row.quantity}
                      aria-invalid={quantityError ? true : undefined}
                      onBlur={() =>
                        formErrors.touchField(`${row.clientKey}.quantity`)
                      }
                      onChange={(event) =>
                        updateRow(index, { quantity: event.target.value })
                      }
                      aria-label={`Quantity for recipe row ${index + 1}`}
                      className="w-full rounded-md border border-border px-2 py-2 text-sm"
                    />
                    <FieldErrorText message={quantityError} />
                  </div>
                  <select
                    value={row.unit}
                    aria-required="true"
                    aria-label={`Unit for recipe row ${index + 1}`}
                    onChange={(event) =>
                      updateRow(index, {
                        unit: event.target.value as InventoryUnit,
                      })
                    }
                    className="rounded-md border border-border bg-surface px-2 py-2 text-sm"
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={`Remove recipe row ${index + 1}`}
                    className="p-2 text-text-disabled hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid items-center gap-2 md:grid-cols-[8rem_1fr_8rem_auto_auto]">
                  <select
                    value={row.scopeType}
                    aria-required="true"
                    aria-label={`Scope for recipe row ${index + 1}`}
                    aria-invalid={scopeError ? true : undefined}
                    onBlur={() =>
                      formErrors.touchField(`${row.clientKey}.scope`)
                    }
                    onChange={(event) =>
                      updateRow(index, {
                        scopeType: event.target
                          .value as RecipeDraftRow["scopeType"],
                        variantId:
                          event.target.value === "variant"
                            ? (item.variants[0]?.id ?? "")
                            : "",
                        modifierOptionId:
                          event.target.value === "modifier"
                            ? (modifierOptions[0]?.id ?? "")
                            : "",
                      })
                    }
                    className="rounded-md border border-border bg-surface px-2 py-2 text-xs"
                  >
                    <option value="base">Base item</option>
                    {item.variants.length ? (
                      <option value="variant">Variant</option>
                    ) : null}
                    {modifierOptions.length ? (
                      <option value="modifier">Modifier</option>
                    ) : null}
                  </select>
                  <div>
                    {row.scopeType === "variant" ? (
                      <select
                        value={row.variantId}
                        aria-required="true"
                        aria-label={`Variant for recipe row ${index + 1}`}
                        onChange={(event) =>
                          updateRow(index, { variantId: event.target.value })
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs"
                      >
                        {item.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name}
                          </option>
                        ))}
                      </select>
                    ) : row.scopeType === "modifier" ? (
                      <select
                        value={row.modifierOptionId}
                        aria-required="true"
                        aria-label={`Modifier option for recipe row ${index + 1}`}
                        onChange={(event) =>
                          updateRow(index, {
                            modifierOptionId: event.target.value,
                          })
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs"
                      >
                        {modifierOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.groupName} · {option.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-text-disabled">
                        Applies to every order of this item
                      </span>
                    )}
                    <FieldErrorText message={scopeError} />
                  </div>
                  <label className="text-xs">
                    <span>Yield %</span>
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={row.yieldPercent}
                      placeholder="100"
                      aria-invalid={yieldError ? true : undefined}
                      onBlur={() =>
                        formErrors.touchField(`${row.clientKey}.yieldPercent`)
                      }
                      onChange={(event) =>
                        updateRow(index, { yieldPercent: event.target.value })
                      }
                      className="ml-1 w-16 rounded border border-border px-1.5 py-1"
                    />
                    <FieldErrorText message={yieldError} />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={row.isOptional}
                      onChange={(event) =>
                        updateRow(index, { isOptional: event.target.checked })
                      }
                    />{" "}
                    optional
                  </label>
                  {!row.isOptional &&
                    (short ? (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        disabled={requiredDependencyLoading}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover disabled:text-text-disabled"
      >
        <Plus className="h-3.5 w-3.5" /> Add ingredient
      </button>
    </div>
  );
};
