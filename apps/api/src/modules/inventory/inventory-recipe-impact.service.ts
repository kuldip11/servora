import type { AuthContext } from "@/core/auth";
import {
  assertInventoryResourceBranch,
  requireInventoryPermission,
} from "./inventory-authorization";
import { inventoryItemNotFound } from "./inventory.errors";
import { canSatisfyNeeds } from "./inventory-recipe.engine";
import { resolveOrderItemRecipeNeeds } from "./inventory-recipe-resolver";
import { inventoryRepository } from "./inventory.repository";

export const inventoryRecipeImpactService = {
  async getRecipeImpact(auth: AuthContext, inventoryItemId: string) {
    requireInventoryPermission(auth, "inventory:read");
    const inventoryItem = await inventoryRepository.findById(
      auth.tenantId,
      inventoryItemId,
    );
    if (!inventoryItem) throw inventoryItemNotFound(inventoryItemId);
    assertInventoryResourceBranch(auth, inventoryItem.branchId);
    const branchId = inventoryItem.branchId;

    const menuItemIds = await inventoryRepository.findAllRecipeMenuItemIds(
      auth.tenantId,
      branchId,
    );
    if (!menuItemIds.length) {
      return {
        inventoryItemId,
        inventoryItemName: inventoryItem.name,
        impacts: [],
      };
    }

    const [recipeRows, menuItems, variants, options] = await Promise.all([
      inventoryRepository.findRequiredRecipeLines(
        auth.tenantId,
        branchId,
        menuItemIds,
      ),
      inventoryRepository.findMenuItemsForAvailability(
        auth.tenantId,
        branchId,
        menuItemIds,
      ),
      inventoryRepository.findScopedRecipeVariants(auth.tenantId, branchId),
      inventoryRepository.findScopedRecipeModifierOptions(
        auth.tenantId,
        branchId,
      ),
    ]);

    const impacts: Array<{
      kind: "ITEM" | "VARIANT" | "MODIFIER_OPTION";
      menuItemId: string;
      menuItemName: string;
      entityId: string;
      entityName: string;
      computedAvailable: boolean;
    }> = [];

    for (const item of menuItems) {
      if (!item.enableRecipeDeduction) continue;
      const baseRows = recipeRows.filter(
        (row) =>
          row.menuItemId === item.id && !row.variantId && !row.modifierOptionId,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        auth.tenantId,
        branchId,
        baseRows,
        {
          menuItemId: item.id,
          quantity: 1,
        },
      );
      if (needs.some((need) => need.inventoryItemId === inventoryItemId)) {
        impacts.push({
          kind: "ITEM",
          menuItemId: item.id,
          menuItemName: item.name,
          entityId: item.id,
          entityName: item.name,
          computedAvailable: canSatisfyNeeds(needs),
        });
      }
    }

    for (const variant of variants) {
      const scopedRows = recipeRows.filter(
        (row) => row.variantId === variant.id,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        auth.tenantId,
        branchId,
        scopedRows,
        {
          menuItemId: variant.menuItemId,
          variantId: variant.id,
          quantity: 1,
        },
      );
      if (needs.some((need) => need.inventoryItemId === inventoryItemId)) {
        impacts.push({
          kind: "VARIANT",
          menuItemId: variant.menuItemId,
          menuItemName: variant.menuItemName,
          entityId: variant.id,
          entityName: variant.name,
          computedAvailable: canSatisfyNeeds(needs),
        });
      }
    }

    for (const option of options) {
      const scopedRows = recipeRows.filter(
        (row) => row.modifierOptionId === option.id,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        auth.tenantId,
        branchId,
        scopedRows,
        {
          menuItemId: option.menuItemId,
          quantity: 1,
          selectedOptions: [{ optionId: option.id, quantity: 1 }],
        },
      );
      if (needs.some((need) => need.inventoryItemId === inventoryItemId)) {
        impacts.push({
          kind: "MODIFIER_OPTION",
          menuItemId: option.menuItemId,
          menuItemName: option.menuItemName,
          entityId: option.id,
          entityName: option.name,
          computedAvailable: canSatisfyNeeds(needs),
        });
      }
    }

    return { inventoryItemId, inventoryItemName: inventoryItem.name, impacts };
  },
};
