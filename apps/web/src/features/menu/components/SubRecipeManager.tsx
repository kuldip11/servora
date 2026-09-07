import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Select } from "@pos/ui";
import type { InventoryUnit } from "@pos/types";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import {
  useSubRecipes,
  subRecipeQueryKey,
} from "@/features/menu/hooks/useSubRecipes";
import { menuSubRecipesService } from "@/features/menu/services/menu-sub-recipes.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

import { INVENTORY_UNITS } from "@/features/menu/constants";
type IngredientDraft = {
  clientKey: string;
  source: "inventory" | "sub";
  sourceId: string;
  quantity: string;
  unit: InventoryUnit;
};

export const SubRecipeManager = () => {
  const queryClient = useQueryClient();
  const { data: subRecipes } = useSubRecipes();
  const { data: inventoryPage } = useInventoryItems({ limit: 100 });
  const inventory = inventoryPage?.items;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [yieldUnit, setYieldUnit] = useState<InventoryUnit>("KG");
  const [yieldPercent, setYieldPercent] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: subRecipeQueryKey() });
  const create = useMutation({
    mutationFn: menuSubRecipesService.create,
    onSuccess: async () => {
      await refresh();
      setName("");
      setYieldQuantity("1");
      setYieldPercent("");
      setIngredients([]);
      setOpen(false);
      notifySuccess("Sub-recipe created");
    },
    onError: (error) => notifyError(error, "Could not create sub-recipe"),
  });
  const remove = useMutation({
    mutationFn: menuSubRecipesService.remove,
    onSuccess: async () => {
      await refresh();
      notifySuccess("Sub-recipe deleted");
    },
    onError: (error) => notifyError(error, "Could not delete sub-recipe"),
  });

  function addIngredient() {
    const firstInventory = inventory?.[0];
    if (firstInventory) {
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
  }

  function save() {
    const parsedYield = Number(yieldQuantity);
    if (!name.trim() || !(parsedYield > 0) || !ingredients.length) {
      notifyError(
        undefined,
        "Name, positive yield, and at least one ingredient are required",
      );
      return;
    }
    create.mutate({
      name: name.trim(),
      yieldQuantity: parsedYield,
      yieldUnit,
      yieldPercent: yieldPercent ? Number(yieldPercent) : null,
      ingredients: ingredients.map((row) => ({
        ...(row.source === "inventory"
          ? { inventoryItemId: row.sourceId }
          : { ingredientSubRecipeId: row.sourceId }),
        quantity: Number(row.quantity),
        unit: row.unit,
      })),
    });
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
          onClick={() => setOpen((value) => !value)}
        >
          <Plus className="h-4 w-4" /> New sub-recipe
        </Button>
      </div>
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
                onClick={() => remove.mutate(row.id)}
                className="text-text-disabled hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="House tomato sauce"
            />
            <Input
              label="Batch yield"
              type="number"
              min="0.001"
              step="0.001"
              value={yieldQuantity}
              onChange={(e) => setYieldQuantity(e.target.value)}
            />
            <Select
              label="Yield unit"
              value={yieldUnit}
              onChange={(e) => setYieldUnit(e.target.value as InventoryUnit)}
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
              onChange={(e) => setYieldPercent(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            {ingredients.map((row, index) => (
              <div
                key={row.clientKey}
                className="grid gap-2 sm:grid-cols-[8rem_1fr_8rem_8rem_auto] items-center"
              >
                <select
                  value={row.source}
                  onChange={(e) => {
                    const source = e.target.value as "inventory" | "sub";
                    const first =
                      source === "inventory" ? inventory?.[0] : subRecipes?.[0];
                    setIngredients((prev) =>
                      prev.map((entry, i) =>
                        i === index
                          ? {
                              ...entry,
                              source,
                              sourceId: first?.id ?? "",
                              unit:
                                source === "inventory"
                                  ? (inventory?.[0]?.unit ?? entry.unit)
                                  : (subRecipes?.[0]?.yieldUnit ?? entry.unit),
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
                <select
                  value={row.sourceId}
                  onChange={(e) => {
                    const sourceId = e.target.value;
                    const nextUnit =
                      row.source === "inventory"
                        ? inventory?.find((item) => item.id === sourceId)?.unit
                        : subRecipes?.find((item) => item.id === sourceId)
                            ?.yieldUnit;
                    setIngredients((prev) =>
                      prev.map((entry, i) =>
                        i === index
                          ? {
                              ...entry,
                              sourceId,
                              ...(nextUnit ? { unit: nextUnit } : {}),
                            }
                          : entry,
                      ),
                    );
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-2 text-xs"
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
                <input
                  aria-label={`Sub-recipe ingredient quantity ${index + 1}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={row.quantity}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((entry, i) =>
                        i === index
                          ? { ...entry, quantity: e.target.value }
                          : entry,
                      ),
                    )
                  }
                  className="rounded-md border border-border px-2 py-2 text-xs"
                />
                <select
                  value={row.unit}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((entry, i) =>
                        i === index
                          ? { ...entry, unit: e.target.value as InventoryUnit }
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
                    setIngredients((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="p-2 text-text-disabled hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={addIngredient}>
              Add ingredient
            </Button>
            <Button size="sm" onClick={save} disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Create component"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
