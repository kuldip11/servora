import { useState, useEffect } from "react";
import { Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { notifyError } from "@/shared/lib/notify";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import { useMenuItemRecipe } from "@/features/menu/hooks/useMenuItemRecipe";
import { useSaveRecipe } from "@/features/menu/hooks/useSaveRecipe";
import { useSubRecipes } from "@/features/menu/hooks/useSubRecipes";
import type { InventoryItem, InventoryUnit, MenuItem } from "@pos/types";

const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: "KG", label: "kg" },
  { value: "GRAMS", label: "g" },
  { value: "LITERS", label: "L" },
  { value: "ML", label: "ml" },
  { value: "PIECES", label: "pcs" },
  { value: "PACKETS", label: "packets" },
];

type SourceType = "inventory" | "sub-recipe";
type ScopeType = "base" | "variant" | "modifier";
interface Row {
  clientKey: string;
  sourceType: SourceType;
  inventoryItemId: string;
  subRecipeId: string;
  scopeType: ScopeType;
  variantId: string;
  modifierOptionId: string;
  quantity: string;
  unit: InventoryUnit;
  yieldPercent: string;
  isOptional: boolean;
}

export const RecipeBuilder = ({ item }: { item: MenuItem }) => {
  const itemId = item.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const { data: recipe, isLoading } = useMenuItemRecipe(itemId);
  const { data: inventoryPage } = useInventoryItems({ limit: 100 });
  const inventoryItems = inventoryPage?.items;
  const { data: subRecipes } = useSubRecipes();
  const saveMutation = useSaveRecipe(itemId);
  const modifierOptions = (item.modifierGroupLinks ?? []).flatMap((link) =>
    link.group.options.map((option) => ({
      ...option,
      groupName: link.group.name,
    })),
  );

  useEffect(() => {
    if (recipe && !dirty) {
      setRows(
        recipe.map((r) => ({
          clientKey: r.id ?? crypto.randomUUID(),
          sourceType: r.subRecipeId ? "sub-recipe" : "inventory",
          inventoryItemId: r.inventoryItemId ?? "",
          subRecipeId: r.subRecipeId ?? "",
          scopeType: r.variantId
            ? "variant"
            : r.modifierOptionId
              ? "modifier"
              : "base",
          variantId: r.variantId ?? "",
          modifierOptionId: r.modifierOptionId ?? "",
          quantity: String(r.quantityRequired),
          unit: r.unit,
          yieldPercent: r.yieldPercent == null ? "" : String(r.yieldPercent),
          isOptional: r.isOptional,
        })),
      );
    }
  }, [recipe, dirty]);

  function handleSave() {
    const ingredients = rows
      .filter(
        (r) =>
          (r.inventoryItemId || r.subRecipeId) && parseFloat(r.quantity) > 0,
      )
      .map((r) => ({
        inventoryItemId:
          r.sourceType === "inventory" ? r.inventoryItemId : null,
        subRecipeId: r.sourceType === "sub-recipe" ? r.subRecipeId : null,
        variantId: r.scopeType === "variant" ? r.variantId : null,
        modifierOptionId:
          r.scopeType === "modifier" ? r.modifierOptionId : null,
        quantity: parseFloat(r.quantity),
        unit: r.unit,
        yieldPercent: r.yieldPercent ? parseFloat(r.yieldPercent) : null,
        isOptional: r.isOptional,
      }));
    saveMutation.mutate(ingredients, { onSuccess: () => setDirty(false) });
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setDirty(true);
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeRow(i: number) {
    setDirty(true);
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addRow() {
    const first = inventoryItems?.[0];
    if (!first && !subRecipes?.length) {
      notifyError(undefined, "Add an inventory item or sub-recipe first");
      return;
    }
    setDirty(true);
    setRows((prev) => [
      ...prev,
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
  }

  const invMap = new Map<string, InventoryItem>(
    (inventoryItems ?? []).map((i) => [i.id, i] as const),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1.5">
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
          disabled={!dirty || saveMutation.isPending}
          className="text-xs font-medium text-primary hover:text-primary-hover disabled:text-text-disabled"
        >
          {saveMutation.isPending ? "Saving…" : dirty ? "Save recipe" : "Saved"}
        </button>
      </div>
      {isLoading ? (
        <p className="text-xs text-text-disabled">Loading…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const inv = invMap.get(row.inventoryItemId);
            const short =
              row.sourceType === "inventory" &&
              inv &&
              parseFloat(row.quantity || "0") > inv.currentStock;
            return (
              <div
                key={row.clientKey}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="grid gap-2 md:grid-cols-[8rem_1fr_8rem_7rem_auto]">
                  <select
                    value={row.sourceType}
                    onChange={(e) => {
                      const sourceType = e.target.value as SourceType;
                      const firstInventory = inventoryItems?.[0];
                      const firstSubRecipe = subRecipes?.[0];
                      updateRow(i, {
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
                    className="px-2 py-2 text-sm border border-border rounded-md bg-surface"
                  >
                    <option value="inventory">Raw item</option>
                    <option value="sub-recipe">Sub-recipe</option>
                  </select>
                  {row.sourceType === "inventory" ? (
                    <select
                      value={row.inventoryItemId}
                      onChange={(e) => {
                        const next = inventoryItems?.find(
                          (x) => x.id === e.target.value,
                        );
                        updateRow(i, {
                          inventoryItemId: e.target.value,
                          ...(next ? { unit: next.unit } : {}),
                        });
                      }}
                      className="px-3 py-2 text-sm border border-border rounded-md bg-surface"
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
                      onChange={(e) => {
                        const next = subRecipes?.find(
                          (x) => x.id === e.target.value,
                        );
                        updateRow(i, {
                          subRecipeId: e.target.value,
                          ...(next ? { unit: next.yieldUnit } : {}),
                        });
                      }}
                      className="px-3 py-2 text-sm border border-border rounded-md bg-surface"
                    >
                      {(subRecipes ?? []).map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, { quantity: e.target.value })}
                    aria-label={`Quantity for recipe row ${i + 1}`}
                    className="px-2 py-2 text-sm border border-border rounded-md"
                  />
                  <select
                    value={row.unit}
                    onChange={(e) =>
                      updateRow(i, { unit: e.target.value as InventoryUnit })
                    }
                    className="px-2 py-2 text-sm border border-border rounded-md bg-surface"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={`Remove recipe row ${i + 1}`}
                    className="p-2 text-text-disabled hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-[8rem_1fr_8rem_auto_auto] items-center">
                  <select
                    value={row.scopeType}
                    onChange={(e) =>
                      updateRow(i, {
                        scopeType: e.target.value as ScopeType,
                        variantId:
                          e.target.value === "variant"
                            ? (item.variants[0]?.id ?? "")
                            : "",
                        modifierOptionId:
                          e.target.value === "modifier"
                            ? (modifierOptions[0]?.id ?? "")
                            : "",
                      })
                    }
                    className="px-2 py-2 text-xs border border-border rounded-md bg-surface"
                  >
                    <option value="base">Base item</option>
                    {item.variants.length ? (
                      <option value="variant">Variant</option>
                    ) : null}
                    {modifierOptions.length ? (
                      <option value="modifier">Modifier</option>
                    ) : null}
                  </select>
                  {row.scopeType === "variant" ? (
                    <select
                      value={row.variantId}
                      onChange={(e) =>
                        updateRow(i, { variantId: e.target.value })
                      }
                      className="px-2 py-2 text-xs border border-border rounded-md bg-surface"
                    >
                      {item.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  ) : row.scopeType === "modifier" ? (
                    <select
                      value={row.modifierOptionId}
                      onChange={(e) =>
                        updateRow(i, { modifierOptionId: e.target.value })
                      }
                      className="px-2 py-2 text-xs border border-border rounded-md bg-surface"
                    >
                      {modifierOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.groupName} · {o.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-text-disabled">
                      Applies to every order of this item
                    </span>
                  )}
                  <label className="flex items-center gap-1 text-xs">
                    <span>Yield %</span>
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={row.yieldPercent}
                      placeholder="100"
                      onChange={(e) =>
                        updateRow(i, { yieldPercent: e.target.value })
                      }
                      className="w-16 px-1.5 py-1 border border-border rounded"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={row.isOptional}
                      onChange={(e) =>
                        updateRow(i, { isOptional: e.target.checked })
                      }
                    />{" "}
                    optional
                  </label>
                  {!row.isOptional &&
                    (short ? (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-success" />
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
        className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
      >
        <Plus className="w-3.5 h-3.5" /> Add ingredient
      </button>
    </div>
  );
};
