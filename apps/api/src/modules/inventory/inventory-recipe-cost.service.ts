import { aggregateRawNeeds } from "./inventory-recipe.engine";
import { resolveOrderItemRecipeNeeds } from "./inventory-recipe-resolver";
import { inventoryRepository } from "./inventory.repository";
import type { RecipeNeedItemInput } from "./inventory.types";

export const inventoryRecipeCostService = {
  async validateStock(
    tenantId: string,
    branchId: string,
    items: RecipeNeedItemInput[],
  ): Promise<{
    valid: boolean;
    insufficient: Array<{
      menuItemId: string;
      inventoryItemId: string;
      name: string;
    }>;
  }> {
    const menuItemIds = items.map((item) => item.menuItemId);
    if (!menuItemIds.length) return { valid: true, insufficient: [] };
    const recipeRows = await inventoryRepository.findRequiredRecipeLines(
      tenantId,
      branchId,
      menuItemIds,
    );

    const totals = new Map<
      string,
      {
        needed: number;
        available: number;
        name: string;
        menuItemIds: Set<string>;
      }
    >();
    for (const item of items) {
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        recipeRows,
        item,
      );
      for (const need of needs) {
        const current = totals.get(need.inventoryItemId);
        if (current) {
          current.needed += need.neededQuantity;
          current.menuItemIds.add(item.menuItemId);
        } else {
          totals.set(need.inventoryItemId, {
            needed: need.neededQuantity,
            available: need.currentStock,
            name: need.name,
            menuItemIds: new Set([item.menuItemId]),
          });
        }
      }
    }

    const insufficient: Array<{
      menuItemId: string;
      inventoryItemId: string;
      name: string;
    }> = [];
    for (const [inventoryItemId, total] of totals) {
      if (total.needed <= total.available) continue;
      const menuItemId = total.menuItemIds.values().next().value;
      if (menuItemId)
        insufficient.push({ menuItemId, inventoryItemId, name: total.name });
    }
    return { valid: insufficient.length === 0, insufficient };
  },

  async computeRecipeCosts(
    tenantId: string,
    branchId: string,
    items: RecipeNeedItemInput[],
  ): Promise<Array<number | null>> {
    if (!items.length) return [];
    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];
    const recipeRows = await inventoryRepository.findRequiredRecipeLines(
      tenantId,
      branchId,
      menuItemIds,
    );
    const subRecipeCache = new Map<
      string,
      Awaited<
        ReturnType<typeof inventoryRepository.findSubRecipeWithIngredients>
      > | null
    >();

    const costs: Array<number | null> = [];
    for (const item of items) {
      const needs = aggregateRawNeeds(
        await resolveOrderItemRecipeNeeds(
          tenantId,
          branchId,
          recipeRows,
          { ...item, quantity: 1 },
          false,
          subRecipeCache,
        ),
      );
      costs.push(
        needs.length
          ? Number(
              needs
                .reduce(
                  (sum, need) => sum + need.neededQuantity * need.costPerUnit,
                  0,
                )
                .toFixed(4),
            )
          : null,
      );
    }
    return costs;
  },

  async computeRecipeCost(
    tenantId: string,
    branchId: string,
    item: RecipeNeedItemInput,
  ) {
    const [cost] = await inventoryRecipeCostService.computeRecipeCosts(
      tenantId,
      branchId,
      [item],
    );
    return cost ?? 0;
  },
};
