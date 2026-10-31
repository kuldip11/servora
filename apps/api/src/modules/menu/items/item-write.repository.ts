import { and, eq, isNull } from "drizzle-orm";
import type { FoodType, MenuItemStatus, SpiceLevel } from "@pos/types";
import { db } from "@/db";
import {
  menuItems,
  menuItemVariants,
  menuItemModifierGroups,
  menuItemTags,
  menuItemAllergens,
  menuItemImages,
  menus,
  menuMemberships,
} from "@/db/schema";
import { withEffectiveMenuItemAvailability } from "@/modules/menu/availability/availability-view";
import { ITEM_DETAIL_RELATIONS, withItemReadModel } from "./item-read-model";

export const itemWriteRepository = {
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
