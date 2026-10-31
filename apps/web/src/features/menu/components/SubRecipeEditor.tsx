import { Button, FieldErrorText, FormErrorSummary } from "@pos/ui";
import type {
  InventoryItemDto as InventoryItem,
  SubRecipeDto,
  SubRecipeInput,
} from "@pos/api-client";
import { useSubRecipeEditorForm } from "@/features/menu/hooks/useSubRecipeEditorForm";
import { SubRecipeBatchFields } from "./forms/SubRecipeBatchFields";
import { SubRecipeIngredientRow } from "./forms/SubRecipeIngredientRow";

type Props = {
  open: boolean;
  inventory: InventoryItem[];
  subRecipes: SubRecipeDto[];
  isSaving: boolean;
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
  onCreate,
}: Props) => {
  const form = useSubRecipeEditorForm({ inventory, subRecipes, onCreate });

  if (!open) return null;

  const ingredientError = form.formErrors.clientError(
    "ingredients",
    form.clientErrors.ingredients,
  );

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <FormErrorSummary messages={form.formErrors.formErrorMessages} />
      <SubRecipeBatchFields form={form} />
      {ingredientError ? <FieldErrorText message={ingredientError} /> : null}
      <div className="space-y-2">
        {form.ingredients.map((row, index) => (
          <SubRecipeIngredientRow
            key={row.clientKey}
            row={row}
            index={index}
            inventory={inventory}
            subRecipes={subRecipes}
            form={form}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={form.addIngredient}>
          Add ingredient
        </Button>
        <Button
          size="sm"
          onClick={form.submit}
          loading={isSaving}
          disabled={isSaving}
        >
          Create component
        </Button>
      </div>
    </div>
  );
};
