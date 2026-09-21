import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { FormErrorSummary, QueryErrorState, StaleDataBanner } from "@pos/ui";
import { notifyError } from "@/shared/lib/notify";
import { useInventoryItems } from "@/features/inventory";
import { useMenuItemRecipe } from "@/features/menu/hooks/useMenuItemRecipe";
import { useSaveRecipe } from "@/features/menu/hooks/useSaveRecipe";
import { useSubRecipes } from "@/features/menu/hooks/useSubRecipes";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  type RecipeDraftRow,
  validateRecipeRows,
} from "@/features/menu/helpers/recipe-form";
import type { MenuItem } from "@pos/types";
import { RecipeRowEditor } from "@/features/menu/components/RecipeRowEditor";

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
              <RecipeRowEditor
                key={row.clientKey}
                row={row}
                index={index}
                item={item}
                inventoryItems={inventoryItems ?? []}
                subRecipes={subRecipes ?? []}
                modifierOptions={modifierOptions}
                quantityError={quantityError}
                yieldError={yieldError}
                sourceError={sourceError}
                scopeError={scopeError}
                onTouch={formErrors.touchField}
                onUpdate={(patch) => updateRow(index, patch)}
                onRemove={() => removeRow(index)}
              />
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
