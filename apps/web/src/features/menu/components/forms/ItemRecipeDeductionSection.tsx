import type { MenuItem } from "@pos/types";
import type { MenuItemFormValues } from "@pos/validation";
import type { UseFormSetValue } from "react-hook-form";
import { RecipeBuilder } from "../RecipeBuilder";

export const ItemRecipeDeductionSection = ({
  item,
  form,
  setValue,
}: {
  item: MenuItem | null;
  form: MenuItemFormValues;
  setValue: UseFormSetValue<MenuItemFormValues>;
}) => (
  <div>
    <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
      <input
        type="checkbox"
        checked={form.enableRecipeDeduction}
        onChange={(event) =>
          setValue("enableRecipeDeduction", event.target.checked, {
            shouldValidate: true,
          })
        }
      />
      Auto-manage availability from inventory
    </label>
    {item ? (
      form.enableRecipeDeduction && <RecipeBuilder item={item} />
    ) : (
      <p className="text-xs text-text-disabled">
        Save the item first, then edit it to link ingredients.
      </p>
    )}
  </div>
);
