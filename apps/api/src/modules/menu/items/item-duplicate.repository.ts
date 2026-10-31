import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  menuItems,
  menuItemVariants,
  menuItemModifierGroups,
  menuItemTags,
  menuItemAllergens,
  menuItemSchedules,
  recipes,
} from "@/db/schema";
import { ITEM_DETAIL_RELATIONS, withItemReadModel } from "./item-read-model";

export const itemDuplicateRepository = {
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
};
