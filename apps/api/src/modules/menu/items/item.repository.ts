import { eq, and, isNull, or, inArray, asc } from "drizzle-orm";
import type { FoodType, MenuItemStatus, SpiceLevel } from "@pos/types";
import { db } from "@/db";
import {
  menuItems,
  menuItemVariants,
  menuItemModifierGroups,
  menuItemTags,
  menuItemAllergens,
  menuItemImages,
  modifierOptions,
  menuCategories,
  menuItemSchedules,
  recipes,
  menus,
  menuMemberships,
  comboSlotOptions,
  orderItems,
} from "@/db/schema";
import {
  withEffectiveMenuItemAvailability,
  withEffectiveModifierAvailability,
} from "@/modules/menu/availability/availability-view";

type MenuItemDetailRelations = NonNullable<
  NonNullable<Parameters<typeof db.query.menuItems.findFirst>[0]>["with"]
>;

export const ITEM_DETAIL_RELATIONS = {
  variants: true,
  images: { orderBy: [asc(menuItemImages.sortOrder)] },
  modifierGroupLinks: {
    with: {
      group: {
        with: {
          options: {
            orderBy: [asc(modifierOptions.sortOrder)],
            with: { variantPrices: true },
          },
        },
      },
    },
  },
  tagLinks: { with: { tag: true } },
  allergenLinks: { with: { allergen: true } },
  recipeLinks: { with: { inventoryItem: true } },
  menuMemberships: { with: { menu: true, category: true } },
} satisfies MenuItemDetailRelations;

function withItemReadModel<
  T extends {
    status: MenuItemStatus | string;
    manualOverrideStatus?: MenuItemStatus | string | null;
    manualStockCount?: number | null;
    modifierGroupLinks?: Array<{
      group: {
        options: Array<{
          computedAvailability: boolean;
          manualOverrideAvailability?: boolean | null;
        }>;
      };
    }>;
  },
>(item: T) {
  return {
    ...withEffectiveMenuItemAvailability(item),
    ...(item.modifierGroupLinks
      ? {
          modifierGroupLinks: item.modifierGroupLinks.map((link) => ({
            ...link,
            group: {
              ...link.group,
              options: link.group.options.map(
                withEffectiveModifierAvailability,
              ),
            },
          })),
        }
      : {}),
  };
}

export const itemRepository = {
  async findCategory(tenantId: string, categoryId: string) {
    return db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.tenantId, tenantId),
      ),
      columns: { id: true, branchId: true },
    });
  },

  async findIdsByCategory(tenantId: string, categoryId: string) {
    const rows = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        eq(menuItems.categoryId, categoryId),
        isNull(menuItems.deletedAt),
      ),
      columns: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findIdsByMenu(tenantId: string, menuId: string) {
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!menu) return null;
    const rows = await db.query.menuMemberships.findMany({
      where: eq(menuMemberships.menuId, menuId),
      columns: { menuItemId: true },
    });
    return rows.map((row) => row.menuItemId);
  },

  async findById(tenantId: string, itemId: string) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      with: ITEM_DETAIL_RELATIONS,
    });
    return item ? withItemReadModel(item) : undefined;
  },

  async create(data: {
    tenantId: string;
    branchId?: string | undefined;
    categoryId: string;
    name: string;
    description?: string | null | undefined;
    basePrice: string;
    manualCost?: string | null | undefined;
    pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
    weightUnit?: "G" | "KG" | "LB" | "OZ" | undefined;
    openPriceMin?: string | undefined;
    openPriceMax?: string | undefined;
    supportsZones?: boolean | undefined;
    zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
    manualStockCount?: number | undefined;
    taxRate?: string | undefined;
    taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null | undefined;
    foodType?: FoodType | undefined;
    spiceLevel?: SpiceLevel | null | undefined;
    sku?: string | null | undefined;
    prepTimeMinutes?: number | null | undefined;
    sortOrder?: number | undefined;
    hsnCode?: string | null | undefined;
    status?: MenuItemStatus | undefined;
    availabilityReason?: string | null | undefined;
    enableRecipeDeduction?: boolean | undefined;
    isPublished?: boolean | undefined;
    displayMode?: "STANDARD" | "GUIDED_BUILDER" | undefined;
    effectiveFrom?: Date | undefined;
    variants?: Array<{ name: string; price: string }> | undefined;
    modifierGroupIds?: string[] | undefined;
    tagIds?: string[] | undefined;
    allergenIds?: string[] | undefined;
    imageUrls?: string[] | undefined;
  }) {
    return db.transaction(async (tx) => {
      const [item] = await tx
        .insert(menuItems)
        .values({
          tenantId: data.tenantId,
          branchId: data.branchId ?? null,
          categoryId: data.categoryId,
          name: data.name,
          description: data.description ?? null,
          basePrice: data.basePrice,
          manualCost: data.manualCost ?? null,
          pricingMode: data.pricingMode ?? "FIXED",
          weightUnit: data.weightUnit ?? null,
          openPriceMin: data.openPriceMin ?? null,
          openPriceMax: data.openPriceMax ?? null,
          supportsZones: data.supportsZones ?? false,
          zonePricingRule: data.zonePricingRule ?? "HIGHER",
          manualStockCount: data.manualStockCount ?? null,
          manualStockCountUpdatedAt:
            data.manualStockCount === undefined ? null : new Date(),
          taxRate: data.taxRate ?? "0",
          taxMode: data.taxMode ?? null,
          foodType: data.foodType ?? "VEG",
          spiceLevel: data.spiceLevel ?? null,
          sku: data.sku ?? null,
          prepTimeMinutes: data.prepTimeMinutes ?? null,
          sortOrder: data.sortOrder ?? 0,
          hsnCode: data.hsnCode ?? null,
          status: data.status ?? "ACTIVE",
          availabilityReason: data.availabilityReason ?? null,
          enableRecipeDeduction: data.enableRecipeDeduction ?? true,
          isPublished: data.isPublished ?? true,
          displayMode: data.displayMode ?? "STANDARD",
          effectiveFrom: data.effectiveFrom ?? null,
          publishedAt: (data.isPublished ?? true) ? new Date() : null,
        })
        .returning();

      if (data.variants?.length) {
        await tx
          .insert(menuItemVariants)
          .values(data.variants.map((v) => ({ menuItemId: item!.id, ...v })));
      }

      const defaultMenu = await tx.query.menus.findFirst({
        where: and(
          eq(menus.tenantId, data.tenantId),
          eq(menus.isDefault, true),
        ),
        columns: { id: true },
      });
      if (defaultMenu) {
        await tx.insert(menuMemberships).values({
          menuId: defaultMenu.id,
          menuItemId: item!.id,
          categoryId: data.categoryId,
          sortOrder: data.sortOrder ?? 0,
        });
      }

      if (data.modifierGroupIds?.length) {
        await tx.insert(menuItemModifierGroups).values(
          data.modifierGroupIds.map((modifierGroupId, i) => ({
            menuItemId: item!.id,
            modifierGroupId,
            sortOrder: i,
          })),
        );
      }

      if (data.tagIds?.length) {
        await tx
          .insert(menuItemTags)
          .values(
            data.tagIds.map((tagId) => ({ menuItemId: item!.id, tagId })),
          );
      }

      if (data.allergenIds?.length) {
        await tx.insert(menuItemAllergens).values(
          data.allergenIds.map((allergenId) => ({
            menuItemId: item!.id,
            allergenId,
          })),
        );
      }

      if (data.imageUrls?.length) {
        await tx.insert(menuItemImages).values(
          data.imageUrls.map((url, i) => ({
            menuItemId: item!.id,
            url,
            sortOrder: i,
          })),
        );
      }

      const created = await tx.query.menuItems.findFirst({
        where: eq(menuItems.id, item!.id),
        with: ITEM_DETAIL_RELATIONS,
      });
      return created ? withItemReadModel(created) : undefined;
    });
  },

  async update(
    tenantId: string,
    itemId: string,
    data: {
      name?: string | undefined;
      description?: string | null | undefined;
      basePrice?: string | undefined;
      manualCost?: string | null | undefined;
      pricingMode?: "FIXED" | "WEIGHT_BASED" | "OPEN" | undefined;
      weightUnit?: "G" | "KG" | "LB" | "OZ" | null | undefined;
      openPriceMin?: string | null | undefined;
      openPriceMax?: string | null | undefined;
      supportsZones?: boolean | undefined;
      zonePricingRule?: "AVERAGE" | "HIGHER" | "SUM_HALF" | undefined;
      manualStockCount?: number | null | undefined;
      manualStockCountUpdatedAt?: Date | undefined;
      taxRate?: string | undefined;
      taxMode?: "INCLUSIVE" | "EXCLUSIVE" | null | undefined;
      foodType?: FoodType | undefined;
      spiceLevel?: SpiceLevel | null | undefined;
      sku?: string | null | undefined;
      prepTimeMinutes?: number | null | undefined;
      sortOrder?: number | undefined;
      hsnCode?: string | null | undefined;
      status?: MenuItemStatus | undefined;
      availabilityReason?: string | null | undefined;
      enableRecipeDeduction?: boolean | undefined;
      displayMode?: "STANDARD" | "GUIDED_BUILDER" | undefined;
      effectiveFrom?: Date | null | undefined;
    },
  ) {
    const patch: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.status !== undefined) {
      patch["statusChangedAt"] = new Date();
    }
    const [updated] = await db
      .update(menuItems)
      .set(patch)
      .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)))
      .returning();
    return updated ? withEffectiveMenuItemAvailability(updated) : undefined;
  },

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

  async duplicate(
    tenantId: string,
    itemId: string,
    options: {
      name?: string | undefined;
      copyRecipes?: boolean | undefined;
      copySchedules?: boolean | undefined;
      copyModifiers?: boolean | undefined;
    } = {},
  ) {
    const source = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.tenantId, tenantId),
        isNull(menuItems.deletedAt),
      ),
      with: {
        variants: true,
        tagLinks: true,
        allergenLinks: true,
        modifierGroupLinks: true,
        recipeLinks: true,
      },
    });
    if (!source) return undefined;

    const copyModifiers = options.copyModifiers ?? true;
    const copyRecipes = options.copyRecipes ?? false;
    const copySchedules = options.copySchedules ?? false;

    return db.transaction(async (tx) => {
      const [copy] = await tx
        .insert(menuItems)
        .values({
          tenantId,
          branchId: source.branchId,
          categoryId: source.categoryId,
          name: options.name?.trim() || `${source.name} (Copy)`,
          description: source.description,
          basePrice: source.basePrice,
          manualCost: source.manualCost,
          pricingMode: source.pricingMode,
          weightUnit: source.weightUnit,
          openPriceMin: source.openPriceMin,
          openPriceMax: source.openPriceMax,
          supportsZones: source.supportsZones,
          zonePricingRule: source.zonePricingRule,
          manualStockCount: source.manualStockCount,
          manualStockCountUpdatedAt: source.manualStockCountUpdatedAt,
          taxRate: source.taxRate,
          taxMode: source.taxMode,
          foodType: source.foodType,
          spiceLevel: source.spiceLevel,
          sku: null,
          prepTimeMinutes: source.prepTimeMinutes,
          sortOrder: source.sortOrder,
          hsnCode: source.hsnCode,
          status: source.status,
          enableRecipeDeduction: source.enableRecipeDeduction,
        })
        .returning();
      const newItemId = copy!.id;

      if (source.variants.length) {
        await tx.insert(menuItemVariants).values(
          source.variants.map((v) => ({
            menuItemId: newItemId,
            name: v.name,
            price: v.price,
          })),
        );
      }

      if (source.tagLinks.length) {
        await tx.insert(menuItemTags).values(
          source.tagLinks.map((l) => ({
            menuItemId: newItemId,
            tagId: l.tagId,
          })),
        );
      }

      if (source.allergenLinks.length) {
        await tx.insert(menuItemAllergens).values(
          source.allergenLinks.map((l) => ({
            menuItemId: newItemId,
            allergenId: l.allergenId,
          })),
        );
      }

      if (copyModifiers && source.modifierGroupLinks.length) {
        await tx.insert(menuItemModifierGroups).values(
          source.modifierGroupLinks.map((l) => ({
            menuItemId: newItemId,
            modifierGroupId: l.modifierGroupId,
            sortOrder: l.sortOrder,
          })),
        );
      }

      if (copyRecipes && source.recipeLinks.length) {
        await tx.insert(recipes).values(
          source.recipeLinks.map((r) => ({
            menuItemId: newItemId,
            inventoryItemId: r.inventoryItemId,
            quantityRequired: r.quantityRequired,
            unit: r.unit,
            isOptional: r.isOptional,
          })),
        );
      }

      if (copySchedules) {
        const schedules = await tx.query.menuItemSchedules.findMany({
          where: eq(menuItemSchedules.menuItemId, itemId),
        });
        if (schedules.length) {
          await tx.insert(menuItemSchedules).values(
            schedules.map((s) => ({
              tenantId,
              menuItemId: newItemId,
              branchId: s.branchId,
              scheduleType: s.scheduleType,
              startTime: s.startTime,
              endTime: s.endTime,
              dayOfWeek: s.dayOfWeek,
              startDate: s.startDate,
              endDate: s.endDate,
              holidayName: s.holidayName,
              statusDuringPeriod: s.statusDuringPeriod,
              isActive: s.isActive,
            })),
          );
        }
      }

      const duplicate = await tx.query.menuItems.findFirst({
        where: eq(menuItems.id, newItemId),
        with: ITEM_DETAIL_RELATIONS,
      });
      return duplicate ? withItemReadModel(duplicate) : undefined;
    });
  },

  async updateStatus(
    tenantId: string,
    itemId: string,
    status: MenuItemStatus,
    reason?: string | undefined,
  ) {
    const [updated] = await db
      .update(menuItems)
      .set({
        status,
        availabilityReason: reason ?? null,
        statusChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuItems.id, itemId),
          eq(menuItems.tenantId, tenantId),
          isNull(menuItems.deletedAt),
        ),
      )
      .returning();
    return updated ? withEffectiveMenuItemAvailability(updated) : undefined;
  },

  async findByStatus(
    tenantId: string,
    branchId: string | null | undefined,
    statuses: MenuItemStatus[],
    categoryId?: string | undefined,
  ) {
    const items = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        isNull(menuItems.deletedAt),
        inArray(menuItems.status, statuses),
        branchId
          ? or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId))
          : undefined,
        categoryId ? eq(menuItems.categoryId, categoryId) : undefined,
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
      with: ITEM_DETAIL_RELATIONS,
    });
    return items.map(withItemReadModel);
  },

  async setTags(tenantId: string, itemId: string, tagIds: string[]) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db.delete(menuItemTags).where(eq(menuItemTags.menuItemId, itemId));
    if (tagIds.length) {
      await db
        .insert(menuItemTags)
        .values(tagIds.map((tagId) => ({ menuItemId: itemId, tagId })));
    }
  },

  async setAllergens(tenantId: string, itemId: string, allergenIds: string[]) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db
      .delete(menuItemAllergens)
      .where(eq(menuItemAllergens.menuItemId, itemId));
    if (allergenIds.length) {
      await db
        .insert(menuItemAllergens)
        .values(
          allergenIds.map((allergenId) => ({ menuItemId: itemId, allergenId })),
        );
    }
  },

  async setModifierGroups(
    tenantId: string,
    itemId: string,
    modifierGroupIds: string[],
  ) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db
      .delete(menuItemModifierGroups)
      .where(eq(menuItemModifierGroups.menuItemId, itemId));
    if (modifierGroupIds.length) {
      await db.insert(menuItemModifierGroups).values(
        modifierGroupIds.map((modifierGroupId, i) => ({
          menuItemId: itemId,
          modifierGroupId,
          sortOrder: i,
        })),
      );
    }
  },

  async setImages(tenantId: string, itemId: string, urls: string[]) {
    const item = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)),
      columns: { id: true },
    });
    if (!item) return;
    await db
      .delete(menuItemImages)
      .where(eq(menuItemImages.menuItemId, itemId));
    if (urls.length) {
      await db
        .insert(menuItemImages)
        .values(
          urls.map((url, i) => ({ menuItemId: itemId, url, sortOrder: i })),
        );
    }
  },

  async softDelete(tenantId: string, itemId: string) {
    await db
      .update(menuItems)
      .set({ deletedAt: new Date() })
      .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)));
  },

  async publish(tenantId: string, itemId: string) {
    const [updated] = await db
      .update(menuItems)
      .set({ isPublished: true, publishedAt: new Date() })
      .where(
        and(
          eq(menuItems.id, itemId),
          eq(menuItems.tenantId, tenantId),
          isNull(menuItems.deletedAt),
        ),
      )
      .returning();
    return updated;
  },

  async unpublish(tenantId: string, itemId: string) {
    const [updated] = await db
      .update(menuItems)
      .set({ isPublished: false })
      .where(
        and(
          eq(menuItems.id, itemId),
          eq(menuItems.tenantId, tenantId),
          isNull(menuItems.deletedAt),
        ),
      )
      .returning();
    return updated;
  },
};
