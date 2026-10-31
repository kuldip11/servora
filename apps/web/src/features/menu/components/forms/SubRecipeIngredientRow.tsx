import { Trash2 } from "lucide-react";
import { FieldErrorText, Select } from "@pos/ui";
import type {
  InventoryItemDto as InventoryItem,
  InventoryUnitDto,
  SubRecipeDto,
} from "@pos/api-client";
import { INVENTORY_UNITS } from "@/features/menu/constants";
import type { SubRecipeIngredientDraft } from "@/features/menu/helpers/sub-recipe-form";
import type { SubRecipeEditorForm } from "@/features/menu/hooks/useSubRecipeEditorForm";

export const SubRecipeIngredientRow = ({
  row,
  index,
  inventory,
  subRecipes,
  form,
}: {
  row: SubRecipeIngredientDraft;
  index: number;
  inventory: InventoryItem[];
  subRecipes: SubRecipeDto[];
  form: SubRecipeEditorForm;
}) => {
  const sourceKey = `ingredients.${index}.sourceId`;
  const quantityKey = `ingredients.${index}.quantity`;
  const sourceError =
    form.formErrors.fieldErrors[`ingredients.${index}.inventoryItemId`] ??
    form.formErrors.fieldErrors[`ingredients.${index}.ingredientSubRecipeId`] ??
    form.formErrors.clientError(sourceKey, form.clientErrors[sourceKey]);
  const quantityError = form.formErrors.fieldError(
    quantityKey,
    form.clientErrors[quantityKey],
  );

  return (
    <div className="grid items-start gap-2 sm:grid-cols-[8rem_1fr_8rem_8rem_auto]">
      <Select
        aria-label={`Source type for sub-recipe row ${index + 1}`}
        value={row.source}
        onChange={(value) =>
          form.changeIngredientSource(index, value as "inventory" | "sub")
        }
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
          onBlur={() => form.formErrors.touchField(sourceKey)}
          onChange={(sourceId) =>
            form.changeIngredientSourceId(index, row, sourceId)
          }
          options={(row.source === "inventory" ? inventory : subRecipes).map(
            (item) => ({ value: item.id, label: item.name }),
          )}
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
          onBlur={() => form.formErrors.touchField(quantityKey)}
          onChange={(event) => {
            form.formErrors.clearFieldError(quantityKey);
            form.updateIngredient(index, { quantity: event.target.value });
          }}
          className="w-full rounded-md border border-border px-2 py-2 text-xs"
        />
        <FieldErrorText message={quantityError} />
      </div>
      <Select
        aria-label={`Unit for sub-recipe row ${index + 1}`}
        value={row.unit}
        onChange={(value) =>
          form.updateIngredient(index, { unit: value as InventoryUnitDto })
        }
        options={INVENTORY_UNITS.map((unit) => ({ value: unit, label: unit }))}
      />
      <button
        type="button"
        onClick={() => form.removeIngredient(index)}
        className="p-2 text-text-disabled hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};
