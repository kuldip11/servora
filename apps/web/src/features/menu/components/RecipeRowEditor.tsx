import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { FieldErrorText, Select } from "@pos/ui";
import type {
  InventoryItem,
  InventoryUnit,
  MenuItem,
  SubRecipe,
} from "@pos/types";
import type { RecipeDraftRow } from "@/features/menu/helpers/recipe-form";

const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: "KG", label: "kg" },
  { value: "GRAMS", label: "g" },
  { value: "LITERS", label: "L" },
  { value: "ML", label: "ml" },
  { value: "PIECES", label: "pcs" },
  { value: "PACKETS", label: "packets" },
];

type ModifierOption = {
  id: string;
  name: string;
  groupName: string;
};

type Props = {
  row: RecipeDraftRow;
  index: number;
  item: MenuItem;
  inventoryItems: InventoryItem[];
  subRecipes: SubRecipe[];
  modifierOptions: ModifierOption[];
  quantityError?: string | undefined;
  yieldError?: string | undefined;
  sourceError?: string | undefined;
  scopeError?: string | undefined;
  onTouch: (field: string) => void;
  onUpdate: (patch: Partial<RecipeDraftRow>) => void;
  onRemove: () => void;
};

export const RecipeRowEditor = ({
  row,
  index,
  item,
  inventoryItems,
  subRecipes,
  modifierOptions,
  quantityError,
  yieldError,
  sourceError,
  scopeError,
  onTouch,
  onUpdate,
  onRemove,
}: Props) => {
  const inventoryItem = inventoryItems.find(
    (candidate) => candidate.id === row.inventoryItemId,
  );
  const short =
    row.sourceType === "inventory" &&
    inventoryItem &&
    Number(row.quantity || "0") > inventoryItem.currentStock;

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid gap-2 md:grid-cols-[8rem_1fr_8rem_7rem_auto]">
        <Select
          aria-label={`Source type for recipe row ${index + 1}`}
          required
          value={row.sourceType}
          onChange={(value) => {
            const sourceType = value as RecipeDraftRow["sourceType"];
            const firstInventory = inventoryItems[0];
            const firstSubRecipe = subRecipes[0];
            onUpdate({
              sourceType,
              inventoryItemId:
                sourceType === "inventory" ? (firstInventory?.id ?? "") : "",
              subRecipeId:
                sourceType === "sub-recipe" ? (firstSubRecipe?.id ?? "") : "",
              unit:
                sourceType === "inventory"
                  ? (firstInventory?.unit ?? row.unit)
                  : (firstSubRecipe?.yieldUnit ?? row.unit),
            });
          }}
          options={[
            { value: "inventory", label: "Raw item" },
            { value: "sub-recipe", label: "Sub-recipe" },
          ]}
        />
        <div>
          {row.sourceType === "inventory" ? (
            <Select
              aria-label={`Ingredient for recipe row ${index + 1}`}
              required
              value={row.inventoryItemId}
              error={sourceError}
              onBlur={() => onTouch(`${row.clientKey}.source`)}
              onChange={(value) => {
                const next = inventoryItems.find(
                  (candidate) => candidate.id === value,
                );
                onUpdate({
                  inventoryItemId: value,
                  ...(next ? { unit: next.unit } : {}),
                });
              }}
              options={inventoryItems.map((source) => ({
                value: source.id,
                label: source.name,
              }))}
            />
          ) : (
            <Select
              aria-label={`Sub-recipe for recipe row ${index + 1}`}
              required
              value={row.subRecipeId}
              error={sourceError}
              onBlur={() => onTouch(`${row.clientKey}.source`)}
              onChange={(value) => {
                const next = subRecipes.find(
                  (candidate) => candidate.id === value,
                );
                onUpdate({
                  subRecipeId: value,
                  ...(next ? { unit: next.yieldUnit } : {}),
                });
              }}
              options={subRecipes.map((source) => ({
                value: source.id,
                label: source.name,
              }))}
            />
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
            onBlur={() => onTouch(`${row.clientKey}.quantity`)}
            onChange={(event) => onUpdate({ quantity: event.target.value })}
            aria-label={`Quantity for recipe row ${index + 1}`}
            className="w-full rounded-md border border-border px-2 py-2 text-sm"
          />
          <FieldErrorText message={quantityError} />
        </div>
        <Select
          aria-label={`Unit for recipe row ${index + 1}`}
          required
          value={row.unit}
          onChange={(value) => onUpdate({ unit: value as InventoryUnit })}
          options={UNIT_OPTIONS}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove recipe row ${index + 1}`}
          className="p-2 text-text-disabled hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid items-center gap-2 md:grid-cols-[8rem_1fr_8rem_auto_auto]">
        <Select
          aria-label={`Scope for recipe row ${index + 1}`}
          required
          value={row.scopeType}
          error={scopeError}
          onBlur={() => onTouch(`${row.clientKey}.scope`)}
          onChange={(value) =>
            onUpdate({
              scopeType: value as RecipeDraftRow["scopeType"],
              variantId:
                value === "variant" ? (item.variants[0]?.id ?? "") : "",
              modifierOptionId:
                value === "modifier" ? (modifierOptions[0]?.id ?? "") : "",
            })
          }
          options={[
            { value: "base", label: "Base item" },
            ...(item.variants.length
              ? [{ value: "variant", label: "Variant" }]
              : []),
            ...(modifierOptions.length
              ? [{ value: "modifier", label: "Modifier" }]
              : []),
          ]}
        />
        <div>
          {row.scopeType === "variant" ? (
            <Select
              aria-label={`Variant for recipe row ${index + 1}`}
              required
              value={row.variantId}
              onChange={(value) => onUpdate({ variantId: value })}
              options={item.variants.map((variant) => ({
                value: variant.id,
                label: variant.name,
              }))}
            />
          ) : row.scopeType === "modifier" ? (
            <Select
              aria-label={`Modifier option for recipe row ${index + 1}`}
              required
              value={row.modifierOptionId}
              onChange={(value) => onUpdate({ modifierOptionId: value })}
              options={modifierOptions.map((option) => ({
                value: option.id,
                label: `${option.groupName} · ${option.name}`,
              }))}
            />
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
            onBlur={() => onTouch(`${row.clientKey}.yieldPercent`)}
            onChange={(event) => onUpdate({ yieldPercent: event.target.value })}
            className="ml-1 w-16 rounded border border-border px-1.5 py-1"
          />
          <FieldErrorText message={yieldError} />
        </label>
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={row.isOptional}
            onChange={(event) => onUpdate({ isOptional: event.target.checked })}
          />
          optional
        </label>
        {!row.isOptional ? (
          short ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )
        ) : null}
      </div>
    </div>
  );
};
