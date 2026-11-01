import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  comboSlotOptions,
  menuItems,
  menuItemVariants,
  orderItems,
} from "@/db/schema";

export const itemVariantRepository = {
  async validateVariantSync(
    tenantId: string,
    itemId: string,
    variants: Array<{ id?: string; name: string; price: string }>,
  ) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return { ok: false as const, reason: "ITEM_NOT_FOUND" as const };

    const existing = await db.query.menuItemVariants.findMany({
      where: eq(menuItemVariants.menuItemId, itemId),
      columns: { id: true },
    });
    const existingIds = new Set(existing.map((variant) => variant.id));
    const submittedExistingIds = variants
      .map((variant) => variant.id)
      .filter((id): id is string => !!id);
    if (submittedExistingIds.some((id) => !existingIds.has(id))) {
      return { ok: false as const, reason: "FOREIGN_VARIANT" as const };
    }

    const retainedIds = new Set(submittedExistingIds);
    const removedIds = existing
      .map((variant) => variant.id)
      .filter((id) => !retainedIds.has(id));
    if (!removedIds.length) return { ok: true as const };

    const [comboReference, orderReference] = await Promise.all([
      db.query.comboSlotOptions.findFirst({
        where: inArray(comboSlotOptions.variantId, removedIds),
        columns: { id: true, variantId: true },
      }),
      db.query.orderItems.findFirst({
        where: inArray(orderItems.variantId, removedIds),
        columns: { id: true, variantId: true },
      }),
    ]);
    const blockedVariantId =
      comboReference?.variantId ?? orderReference?.variantId;
    if (blockedVariantId) {
      return {
        ok: false as const,
        reason: "VARIANT_IN_USE" as const,
        variantId: blockedVariantId,
      };
    }

    return { ok: true as const };
  },

  async setVariants(
    tenantId: string,
    itemId: string,
    variants: Array<{ id?: string; name: string; price: string }>,
  ) {
    return db.transaction(async (tx) => {
      const item = await tx.query.menuItems.findFirst({
        where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
        columns: { id: true },
      });
      if (!item) return false;

      const existing = await tx.query.menuItemVariants.findMany({
        where: eq(menuItemVariants.menuItemId, itemId),
        columns: { id: true },
      });
      const existingIds = new Set(existing.map((variant) => variant.id));
      const submittedExistingIds = variants
        .map((variant) => variant.id)
        .filter((id): id is string => !!id);
      if (submittedExistingIds.some((id) => !existingIds.has(id))) return false;

      const retainedIds = new Set<string>();
      for (const variant of variants) {
        if (variant.id) {
          retainedIds.add(variant.id);
          await tx
            .update(menuItemVariants)
            .set({ name: variant.name, price: variant.price })
            .where(
              and(
                eq(menuItemVariants.id, variant.id),
                eq(menuItemVariants.menuItemId, itemId),
              ),
            );
        } else {
          await tx.insert(menuItemVariants).values({
            menuItemId: itemId,
            name: variant.name,
            price: variant.price,
          });
        }
      }

      const removedIds = existing
        .map((variant) => variant.id)
        .filter((id) => !retainedIds.has(id));
      if (removedIds.length) {
        await tx
          .delete(menuItemVariants)
          .where(
            and(
              eq(menuItemVariants.menuItemId, itemId),
              inArray(menuItemVariants.id, removedIds),
            ),
          );
      }
      return true;
    });
  },
};
