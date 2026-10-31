import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  modifierGroups,
  modifierOptions,
  modifierOptionVariantPrices,
} from "@/db/schema";
import { compact } from "@/lib/object-utils";
import { withEffectiveModifierAvailability } from "@/modules/menu/availability/availability-view";

export const modifierGroupRepository = {
  async createModifierGroup(data: {
    tenantId: string;
    branchId?: string | undefined;
    name: string;
    selectionType?: "SINGLE" | "MULTIPLE" | undefined;
    minSelections?: number | undefined;
    maxSelections?: number | undefined;
    options?:
      | Array<{
          name: string;
          additionalPrice: string;
          maxQuantity?: number | undefined;
          variantPrices?:
            Array<{ variantId: string; additionalPrice: string }> | undefined;
        }>
      | undefined;
    dependsOnOptionId?: string | null | undefined;
    groupType?: "ADDON" | "SUBSTITUTION" | undefined;
  }) {
    return db.transaction(async (tx) => {
      const [group] = await tx
        .insert(modifierGroups)
        .values({
          tenantId: data.tenantId,
          branchId: data.branchId ?? null,
          name: data.name,
          selectionType: data.selectionType ?? "SINGLE",
          minSelections: data.minSelections ?? 0,
          maxSelections: data.maxSelections ?? null,
          dependsOnOptionId: data.dependsOnOptionId ?? null,
          groupType: data.groupType ?? "ADDON",
        })
        .returning();

      if (data.options?.length) {
        for (const [sortOrder, raw] of data.options.entries()) {
          const { variantPrices, ...option } = raw;
          const [createdOption] = await tx
            .insert(modifierOptions)
            .values(
              compact({
                modifierGroupId: group!.id,
                sortOrder,
                ...option,
              }) as typeof modifierOptions.$inferInsert,
            )
            .returning({ id: modifierOptions.id });
          if (variantPrices?.length && createdOption) {
            await tx.insert(modifierOptionVariantPrices).values(
              variantPrices.map((price) => ({
                modifierOptionId: createdOption.id,
                variantId: price.variantId,
                additionalPrice: price.additionalPrice,
              })),
            );
          }
        }
      }

      const created = await tx.query.modifierGroups.findFirst({
        where: eq(modifierGroups.id, group!.id),
        with: { options: true },
      });
      return created
        ? {
            ...created,
            options: created.options.map(withEffectiveModifierAvailability),
          }
        : undefined;
    });
  },

  async updateModifierGroup(
    tenantId: string,
    groupId: string,
    data: {
      name?: string | undefined;
      selectionType?: "SINGLE" | "MULTIPLE" | undefined;
      minSelections?: number | undefined;
      maxSelections?: number | null | undefined;
      dependsOnOptionId?: string | null | undefined;
      groupType?: "ADDON" | "SUBSTITUTION" | undefined;
    },
  ) {
    const [updated] = await db
      .update(modifierGroups)
      .set(compact({ ...data, updatedAt: new Date() }))
      .where(
        and(
          eq(modifierGroups.id, groupId),
          eq(modifierGroups.tenantId, tenantId),
        ),
      )
      .returning();
    return updated;
  },

  async deleteModifierGroup(tenantId: string, groupId: string) {
    await db
      .delete(modifierGroups)
      .where(
        and(
          eq(modifierGroups.id, groupId),
          eq(modifierGroups.tenantId, tenantId),
        ),
      );
  },
};
