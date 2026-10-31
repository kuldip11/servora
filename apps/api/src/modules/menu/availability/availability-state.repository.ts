import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import type { MenuItemStatus } from "@pos/types";
import { db } from "@/db";
import {
  menuItemModifierGroups,
  menuItems,
  menuItemVariants,
  modifierOptions,
} from "@/db/schema";
import {
  withEffectiveMenuItemAvailability,
  withEffectiveModifierAvailability,
} from "./availability-view";

export const availabilityStateRepository = {
  async setManualStockCount(
    tenantId: string,
    itemId: string,
    count: number | null,
    variantId?: string | null,
  ) {
    if (variantId) {
      const variant = await db.query.menuItemVariants.findFirst({
        where: eq(menuItemVariants.id, variantId),
        with: { menuItem: true },
      });
      if (
        !variant ||
        variant.menuItemId !== itemId ||
        variant.menuItem.tenantId !== tenantId
      )
        return null;
      const [row] = await db
        .update(menuItemVariants)
        .set({ manualStockCount: count, manualStockCountUpdatedAt: new Date() })
        .where(eq(menuItemVariants.id, variantId))
        .returning();
      return { ...row!, menuItemId: itemId, entityType: "VARIANT" as const };
    }
    const [row] = await db
      .update(menuItems)
      .set({
        manualStockCount: count,
        manualStockCountUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)))
      .returning();
    return row
      ? { ...row, menuItemId: itemId, entityType: "ITEM" as const }
      : null;
  },

  async findVariant(variantId: string) {
    return db.query.menuItemVariants.findFirst({
      where: eq(menuItemVariants.id, variantId),
      with: { menuItem: true },
    });
  },

  async setVariantOverride(
    variantId: string,
    status: MenuItemStatus | null,
    reason: string | null,
  ) {
    const [row] = await db
      .update(menuItemVariants)
      .set({ manualOverrideStatus: status, manualOverrideReason: reason })
      .where(eq(menuItemVariants.id, variantId))
      .returning();
    return row;
  },

  async setComputedItemStatus(
    tenantId: string,
    itemId: string,
    status: "ACTIVE" | "OUT_OF_STOCK",
    reason: string | null,
  ) {
    const [row] = await db
      .update(menuItems)
      .set({
        status,
        availabilityReason: reason,
        statusChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)))
      .returning();
    return row;
  },

  async setComputedVariantStatus(
    variantId: string,
    status: "ACTIVE" | "OUT_OF_STOCK",
  ) {
    const [row] = await db
      .update(menuItemVariants)
      .set({ status })
      .where(eq(menuItemVariants.id, variantId))
      .returning();
    return row;
  },

  async findModifierOptionForItem(
    tenantId: string,
    menuItemId: string,
    optionId: string,
  ) {
    const [row] = await db
      .select({
        id: modifierOptions.id,
        computedAvailability: modifierOptions.computedAvailability,
        manualOverrideAvailability: modifierOptions.manualOverrideAvailability,
      })
      .from(modifierOptions)
      .innerJoin(
        menuItemModifierGroups,
        eq(
          menuItemModifierGroups.modifierGroupId,
          modifierOptions.modifierGroupId,
        ),
      )
      .innerJoin(menuItems, eq(menuItems.id, menuItemModifierGroups.menuItemId))
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          eq(menuItems.id, menuItemId),
          eq(modifierOptions.id, optionId),
        ),
      )
      .limit(1);
    return row ? withEffectiveModifierAvailability(row) : null;
  },

  async setComputedModifierAvailability(
    optionId: string,
    computedAvailability: boolean,
  ) {
    const [row] = await db
      .update(modifierOptions)
      .set({ computedAvailability })
      .where(eq(modifierOptions.id, optionId))
      .returning();
    return row ? withEffectiveModifierAvailability(row) : undefined;
  },

  async findByIds(
    tenantId: string,
    ids: string[],
    branchId: string | undefined,
    asOf: Date,
  ) {
    const items = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        inArray(menuItems.id, ids),
        isNull(menuItems.deletedAt),
        eq(menuItems.isPublished, true),
        or(isNull(menuItems.effectiveFrom), lte(menuItems.effectiveFrom, asOf)),
        branchId
          ? or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId))
          : undefined,
      ),
      with: {
        variants: true,
        modifierGroupLinks: {
          with: {
            group: { with: { options: { with: { variantPrices: true } } } },
          },
        },
      },
    });

    return items.map((item) => ({
      ...withEffectiveMenuItemAvailability(item),
      modifierGroupLinks: item.modifierGroupLinks.map((link) => ({
        ...link,
        group: {
          ...link.group,
          options: link.group.options.map(withEffectiveModifierAvailability),
        },
      })),
    }));
  },

  async findItemBasics(tenantId: string, itemId: string) {
    return db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: {
        id: true,
        status: true,
        branchId: true,
        availabilityReason: true,
        manualOverrideStatus: true,
        manualOverrideReason: true,
        manualOverrideSetBy: true,
        manualOverrideSetAt: true,
        manualStockCount: true,
        manualStockCountUpdatedAt: true,
      },
    });
  },

  async findFullItem(tenantId: string, itemId: string) {
    return db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
    });
  },
};
