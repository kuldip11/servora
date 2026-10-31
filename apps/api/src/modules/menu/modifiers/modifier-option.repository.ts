import { and, eq, inArray } from "drizzle-orm";
import { ValidationError } from "@/core/errors";
import { db } from "@/db";
import {
  menuItemModifierGroups,
  menuItems,
  menuItemVariants,
  modifierOptions,
  modifierOptionVariantPrices,
} from "@/db/schema";
import { withEffectiveModifierAvailability } from "@/modules/menu/availability/availability-view";

export const modifierOptionRepository = {
  async setModifierGroupOptions(
    groupId: string,
    options: Array<{
      id?: string | undefined;
      name: string;
      additionalPrice: string;
      isAvailable?: boolean | undefined;
      maxQuantity?: number | undefined;
      isDefault?: boolean | undefined;
      replacesDefaultComponent?: string | undefined;
      variantPrices?:
        Array<{ variantId: string; additionalPrice: string }> | undefined;
    }>,
  ) {
    await db.transaction(async (tx) => {
      const existing = await tx.query.modifierOptions.findMany({
        where: eq(modifierOptions.modifierGroupId, groupId),
      });
      const existingById = new Map(
        existing.map((option) => [option.id, option]),
      );
      const retainedIds = new Set(
        options.flatMap((option) => (option.id ? [option.id] : [])),
      );

      for (const id of retainedIds) {
        if (!existingById.has(id)) {
          throw new ValidationError(
            `Modifier option ${id} does not belong to group ${groupId}`,
          );
        }
      }

      const removedIds = existing
        .map((option) => option.id)
        .filter((id) => !retainedIds.has(id));
      if (removedIds.length) {
        await tx
          .delete(modifierOptions)
          .where(inArray(modifierOptions.id, removedIds));
      }

      for (const [sortOrder, option] of options.entries()) {
        const variantPrices = option.variantPrices;
        if (option.id) {
          const previous = existingById.get(option.id)!;
          const availabilityPatch =
            option.isAvailable === undefined
              ? {}
              : option.isAvailable
                ? { manualOverrideAvailability: null }
                : { manualOverrideAvailability: false };
          await tx
            .update(modifierOptions)
            .set({
              name: option.name,
              additionalPrice: option.additionalPrice,
              maxQuantity: option.maxQuantity ?? previous.maxQuantity,
              isDefault: option.isDefault ?? previous.isDefault,
              replacesDefaultComponent:
                option.replacesDefaultComponent === undefined
                  ? previous.replacesDefaultComponent
                  : option.replacesDefaultComponent || null,
              sortOrder,
              ...availabilityPatch,
            })
            .where(eq(modifierOptions.id, option.id));
          if (variantPrices !== undefined) {
            await tx
              .delete(modifierOptionVariantPrices)
              .where(
                eq(modifierOptionVariantPrices.modifierOptionId, option.id),
              );
            if (variantPrices.length)
              await tx.insert(modifierOptionVariantPrices).values(
                variantPrices.map((price) => ({
                  modifierOptionId: option.id!,
                  variantId: price.variantId,
                  additionalPrice: price.additionalPrice,
                })),
              );
          }
          continue;
        }

        const [createdOption] = await tx
          .insert(modifierOptions)
          .values({
            modifierGroupId: groupId,
            name: option.name,
            additionalPrice: option.additionalPrice,
            computedAvailability: true,
            manualOverrideAvailability:
              option.isAvailable === false ? false : null,
            maxQuantity: option.maxQuantity ?? 1,
            isDefault: option.isDefault ?? false,
            replacesDefaultComponent: option.replacesDefaultComponent || null,
            sortOrder,
          })
          .returning({ id: modifierOptions.id });
        if (createdOption && variantPrices?.length)
          await tx.insert(modifierOptionVariantPrices).values(
            variantPrices.map((price) => ({
              modifierOptionId: createdOption.id,
              variantId: price.variantId,
              additionalPrice: price.additionalPrice,
            })),
          );
      }
    });
  },

  async findEligibleVariantIdsForGroup(
    tenantId: string,
    groupId: string,
    variantIds: string[],
  ) {
    if (!variantIds.length) return new Set<string>();
    const rows = await db
      .select({ id: menuItemVariants.id })
      .from(menuItemVariants)
      .innerJoin(menuItems, eq(menuItemVariants.menuItemId, menuItems.id))
      .innerJoin(
        menuItemModifierGroups,
        and(
          eq(menuItemModifierGroups.menuItemId, menuItems.id),
          eq(menuItemModifierGroups.modifierGroupId, groupId),
        ),
      )
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          inArray(menuItemVariants.id, variantIds),
        ),
      );
    return new Set(rows.map((row) => row.id));
  },

  async findModifierOption(tenantId: string, optionId: string) {
    const option = await db.query.modifierOptions.findFirst({
      where: eq(modifierOptions.id, optionId),
      with: { group: true },
    });
    if (!option || option.group.tenantId !== tenantId) return null;
    return {
      id: option.id,
      branchId: option.group.branchId,
      modifierGroupId: option.modifierGroupId,
    };
  },

  async setOptionAvailability(
    tenantId: string,
    optionId: string,
    isAvailable: boolean,
  ) {
    const option = await db.query.modifierOptions.findFirst({
      where: eq(modifierOptions.id, optionId),
      with: { group: true },
    });
    if (!option || option.group.tenantId !== tenantId) return null;

    const manualOverrideAvailability = isAvailable ? null : false;
    const effectiveAvailability = isAvailable
      ? option.computedAvailability
      : false;
    const [updated] = await db
      .update(modifierOptions)
      .set({
        manualOverrideAvailability,
      })
      .where(eq(modifierOptions.id, optionId))
      .returning();
    return updated
      ? {
          ...withEffectiveModifierAvailability(updated),
          isAvailable: effectiveAvailability,
        }
      : undefined;
  },
};
