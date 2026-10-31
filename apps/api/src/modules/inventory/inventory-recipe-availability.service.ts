import { availabilityService } from "@/modules/menu/availability/availability.service";
import { canSatisfyNeeds } from "./inventory-recipe.engine";
import { resolveOrderItemRecipeNeeds } from "./inventory-recipe-resolver";
import { inventoryRepository } from "./inventory.repository";

export const inventoryRecipeAvailabilityService = {
  async clearRecipeAvailabilitySignals(
    tenantId: string,
    branchId: string,
    menuItemId: string,
  ) {
    const [variants, options] = await Promise.all([
      inventoryRepository.findScopedRecipeVariants(tenantId, branchId),
      inventoryRepository.findScopedRecipeModifierOptions(tenantId, branchId),
    ]);
    await availabilityService.applyInventoryItemSignal(
      tenantId,
      branchId,
      menuItemId,
      true,
    );
    for (const variant of variants.filter(
      (row) => row.menuItemId === menuItemId,
    )) {
      await availabilityService.applyInventoryVariantSignal(
        tenantId,
        branchId,
        variant.id,
        true,
      );
    }
    for (const option of options.filter(
      (row) => row.menuItemId === menuItemId,
    )) {
      await availabilityService.applyInventoryModifierSignal(
        tenantId,
        branchId,
        menuItemId,
        option.id,
        true,
      );
    }
  },

  async syncRecipeConfigurationAvailability(
    tenantId: string,
    branchId: string,
    menuItemId: string,
    previousVariantIds: string[] = [],
    previousModifierOptionIds: string[] = [],
  ) {
    const [recipeRows, items, currentVariants, currentOptions] =
      await Promise.all([
        inventoryRepository.findRequiredRecipeLines(tenantId, branchId, [
          menuItemId,
        ]),
        inventoryRepository.findMenuItemsForAvailability(tenantId, branchId, [
          menuItemId,
        ]),
        inventoryRepository.findScopedRecipeVariants(tenantId, branchId),
        inventoryRepository.findScopedRecipeModifierOptions(tenantId, branchId),
      ]);
    const item = items.find((row) => row.id === menuItemId);
    if (!item || !item.enableRecipeDeduction) return;

    const baseRows = recipeRows.filter(
      (row) =>
        row.menuItemId === menuItemId &&
        !row.variantId &&
        !row.modifierOptionId,
    );
    const baseNeeds = await resolveOrderItemRecipeNeeds(
      tenantId,
      branchId,
      baseRows,
      {
        menuItemId,
        quantity: 1,
      },
    );
    await availabilityService.applyInventoryItemSignal(
      tenantId,
      branchId,
      menuItemId,
      canSatisfyNeeds(baseNeeds),
    );

    const variantIds = new Set([
      ...previousVariantIds,
      ...currentVariants
        .filter((row) => row.menuItemId === menuItemId)
        .map((row) => row.id),
    ]);
    for (const variantId of variantIds) {
      const variant = currentVariants.find((row) => row.id === variantId);
      if (variant && !variant.enableRecipeDeduction) continue;
      const scopedRows = recipeRows.filter(
        (row) => row.variantId === variantId,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        scopedRows,
        {
          menuItemId,
          variantId,
          quantity: 1,
        },
      );
      await availabilityService.applyInventoryVariantSignal(
        tenantId,
        branchId,
        variantId,
        canSatisfyNeeds(needs),
      );
    }

    const modifierIds = new Set([
      ...previousModifierOptionIds,
      ...currentOptions
        .filter((row) => row.menuItemId === menuItemId)
        .map((row) => row.id),
    ]);
    for (const optionId of modifierIds) {
      const option = currentOptions.find((row) => row.id === optionId);
      if (option && !option.enableRecipeDeduction) continue;
      const scopedRows = recipeRows.filter(
        (row) => row.modifierOptionId === optionId,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        scopedRows,
        {
          menuItemId,
          quantity: 1,
          selectedOptions: [{ optionId, quantity: 1 }],
        },
      );
      await availabilityService.applyInventoryModifierSignal(
        tenantId,
        branchId,
        menuItemId,
        optionId,
        canSatisfyNeeds(needs),
      );
    }
  },

  async syncMenuItemAvailability(
    tenantId: string,
    branchId: string,
    inventoryItemIds: string[],
  ) {
    if (!inventoryItemIds.length) return;

    const menuItemIds = await inventoryRepository.findAllRecipeMenuItemIds(
      tenantId,
      branchId,
    );
    if (!menuItemIds.length) return;
    const recipeRows = await inventoryRepository.findRequiredRecipeLines(
      tenantId,
      branchId,
      menuItemIds,
    );
    const items = await inventoryRepository.findMenuItemsForAvailability(
      tenantId,
      branchId,
      menuItemIds,
    );

    for (const item of items) {
      if (!item.enableRecipeDeduction) continue;
      const baseRows = recipeRows.filter(
        (row) =>
          row.menuItemId === item.id && !row.variantId && !row.modifierOptionId,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        baseRows,
        {
          menuItemId: item.id,
          quantity: 1,
        },
      );
      await availabilityService.applyInventoryItemSignal(
        tenantId,
        branchId,
        item.id,
        canSatisfyNeeds(needs),
      );
    }

    const variants = await inventoryRepository.findScopedRecipeVariants(
      tenantId,
      branchId,
    );
    for (const variant of variants) {
      if (!variant.enableRecipeDeduction) continue;
      const scopedRows = recipeRows.filter(
        (row) => row.variantId === variant.id,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        scopedRows,
        {
          menuItemId: variant.menuItemId,
          variantId: variant.id,
          quantity: 1,
        },
      );
      await availabilityService.applyInventoryVariantSignal(
        tenantId,
        branchId,
        variant.id,
        canSatisfyNeeds(needs),
      );
    }

    const options = await inventoryRepository.findScopedRecipeModifierOptions(
      tenantId,
      branchId,
    );
    for (const option of options) {
      if (!option.enableRecipeDeduction) continue;
      const scopedRows = recipeRows.filter(
        (row) => row.modifierOptionId === option.id,
      );
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        scopedRows,
        {
          menuItemId: option.menuItemId,
          quantity: 1,
          selectedOptions: [{ optionId: option.id, quantity: 1 }],
        },
      );
      await availabilityService.applyInventoryModifierSignal(
        tenantId,
        branchId,
        option.menuItemId,
        option.id,
        canSatisfyNeeds(needs),
      );
    }
  },
};
