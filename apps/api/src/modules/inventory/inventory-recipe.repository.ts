import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryItems,
  menuItems,
  menuItemVariants,
  modifierOptions,
  recipes,
} from "@/db/schema";
import { effectiveModifierAvailability } from "@/modules/menu/availability/availability-view";

export const inventoryRecipeRepository = {
  async findRequiredRecipeLines(
    tenantId: string,
    branchId: string,
    menuItemIds: string[],
  ) {
    if (!menuItemIds.length) return [];
    return db.query.recipes
      .findMany({
        where: and(
          inArray(recipes.menuItemId, menuItemIds),
          eq(recipes.isOptional, false),
        ),
        with: {
          inventoryItem: true,
          subRecipe: true,
          variant: true,
          modifierOption: true,
          menuItem: {
            columns: {
              enableRecipeDeduction: true,
              tenantId: true,
              branchId: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.filter(
          (row) =>
            row.menuItem.tenantId === tenantId &&
            (row.menuItem.branchId === null ||
              row.menuItem.branchId === branchId) &&
            (!row.inventoryItem ||
              (row.inventoryItem.tenantId === tenantId &&
                row.inventoryItem.branchId === branchId)) &&
            (!row.subRecipe || row.subRecipe.tenantId === tenantId),
        ),
      );
  },

  async findSubRecipeWithIngredients(tenantId: string, subRecipeId: string) {
    return db.query.subRecipes.findFirst({
      where: (t, { and: a, eq: e }) =>
        a(e(t.id, subRecipeId), e(t.tenantId, tenantId)),
      with: {
        ingredients: {
          with: { inventoryItem: true, ingredientSubRecipe: true },
        },
      },
    });
  },

  async findAllRecipeMenuItemIds(tenantId: string, branchId: string) {
    const rows = await db
      .selectDistinct({ id: recipes.menuItemId })
      .from(recipes)
      .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId))
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
          isNull(menuItems.deletedAt),
        ),
      );
    return rows.map((row) => row.id);
  },

  async findScopedRecipeVariants(tenantId: string, branchId: string) {
    return db
      .selectDistinct({
        id: menuItemVariants.id,
        name: menuItemVariants.name,
        menuItemId: menuItemVariants.menuItemId,
        menuItemName: menuItems.name,
        status: menuItemVariants.status,
        manualOverrideStatus: menuItemVariants.manualOverrideStatus,
        enableRecipeDeduction: menuItems.enableRecipeDeduction,
      })
      .from(recipes)
      .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId))
      .innerJoin(menuItemVariants, eq(menuItemVariants.id, recipes.variantId))
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
          isNull(menuItems.deletedAt),
          isNotNull(recipes.variantId),
        ),
      );
  },

  async findScopedRecipeModifierOptions(tenantId: string, branchId: string) {
    const rows = await db
      .selectDistinct({
        id: modifierOptions.id,
        name: modifierOptions.name,
        menuItemId: recipes.menuItemId,
        menuItemName: menuItems.name,
        computedAvailability: modifierOptions.computedAvailability,
        manualOverrideAvailability: modifierOptions.manualOverrideAvailability,
        enableRecipeDeduction: menuItems.enableRecipeDeduction,
      })
      .from(recipes)
      .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId))
      .innerJoin(
        modifierOptions,
        eq(modifierOptions.id, recipes.modifierOptionId),
      )
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
          isNull(menuItems.deletedAt),
          isNotNull(recipes.modifierOptionId),
        ),
      );
    return rows.map((row) => ({
      ...row,
      isAvailable: effectiveModifierAvailability(row),
    }));
  },

  async findMenuItemsForAvailability(
    tenantId: string,
    branchId: string,
    menuItemIds: string[],
  ) {
    if (!menuItemIds.length) return [];
    return db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        inArray(menuItems.id, menuItemIds),
        isNull(menuItems.deletedAt),
        or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
      ),
      columns: {
        id: true,
        name: true,
        status: true,
        enableRecipeDeduction: true,
      },
    });
  },

  async findNonOptionalIngredients(
    tenantId: string,
    branchId: string,
    menuItemId: string,
  ) {
    return db
      .select({
        quantityRequired: recipes.quantityRequired,
        inventoryItem: inventoryItems,
      })
      .from(recipes)
      .innerJoin(inventoryItems, eq(inventoryItems.id, recipes.inventoryItemId))
      .where(
        and(
          eq(recipes.menuItemId, menuItemId),
          eq(recipes.isOptional, false),
          eq(inventoryItems.tenantId, tenantId),
          eq(inventoryItems.branchId, branchId),
        ),
      );
  },
};
