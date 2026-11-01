import type { SeedDatabase, DemoConfig, SeedContext } from "./types";
import {
  menuCategories,
  menuItemModifierGroups,
  menuItems,
  menuItemVariants,
  menuMemberships,
  menus,
  modifierGroups,
  modifierOptions,
  menuAllergens,
  menuItemAllergens,
  combos,
  comboSlots,
  comboSlotOptions,
} from "@/db/schema";
import { catalogItem, recipeFor, categoryFor } from "./catalog";
import { money, uuidFor } from "./utils";

export const seedMenus = async (
  db: SeedDatabase,
  config: DemoConfig,
  ctx: SeedContext,
): Promise<void> => {
  for (const [brandIndex, brand] of config.brands.entries()) {
    const tenantId = ctx.tenantIds[brand.key]!;
    const menuId = uuidFor(`menu:${brand.key}`);
    await db.insert(menus).values({
      id: menuId,
      tenantId,
      name: `${brand.name} All Day Menu`,
      description: "Published enterprise demo menu",
      status: "PUBLISHED",
      isDefault: true,
      availableChannels: ["STAFF", "CUSTOMER_QR"],
      availableFulfillmentTypes: ["DINE_IN", "TAKEAWAY", "DELIVERY", "ONLINE"],
      effectiveFrom: new Date(
        config.referenceTime.getTime() - (config.historyDays + 1) * 86400000,
      ),
    });
    await db.insert(menus).values({
      id: uuidFor(`menu:${brand.key}:draft`),
      tenantId,
      name: `${brand.name} Seasonal Draft`,
      description: "Unpublished menu for draft and editing test cases",
      status: "DRAFT",
      isDefault: false,
      availableChannels: ["STAFF"],
      availableFulfillmentTypes: ["DINE_IN"],
    });

    const categoryRows = brand.categoryNames.map((name, index) => ({
      id: uuidFor(`category:${brand.key}:${index}`),
      tenantId,
      name,
      description: `${name} from ${brand.name}`,
      sortOrder: index + 1,
      isActive: true,
    }));
    await db.insert(menuCategories).values(categoryRows);

    const itemRows = Array.from(
      { length: brand.menuItemCount },
      (_, itemIndex) => {
        const spec = catalogItem(brand, brandIndex, itemIndex);
        const name = spec.name;
        const base = spec.price;
        const categoryId = categoryRows[categoryFor(brand, name)]!.id;
        return {
          id: uuidFor(`item:${brand.key}:${itemIndex}`),
          tenantId,
          categoryId,
          name,
          description: `Freshly prepared ${name.toLowerCase()} — demo menu item with realistic pricing and preparation data.`,
          basePrice: money(base),
          manualCost: money(base * (0.24 + (itemIndex % 8) * 0.012)),
          taxRate: "5.00",
          taxMode: "EXCLUSIVE" as const,
          foodType: spec.foodType,
          spiceLevel: (["NONE", "MILD", "MEDIUM", "HOT"] as const)[
            itemIndex % 4
          ]!,
          pricingMode:
            itemIndex === brand.menuItemCount - 6
              ? ("WEIGHT_BASED" as const)
              : itemIndex === brand.menuItemCount - 5
                ? ("OPEN" as const)
                : ("FIXED" as const),
          weightUnit:
            itemIndex === brand.menuItemCount - 6 ? ("KG" as const) : null,
          openPriceMin:
            itemIndex === brand.menuItemCount - 5 ? money(base * 0.75) : null,
          openPriceMax:
            itemIndex === brand.menuItemCount - 5 ? money(base * 1.5) : null,
          sku: `${brand.key.toUpperCase()}-${String(itemIndex + 1).padStart(4, "0")}`,
          prepTimeMinutes: 5 + (itemIndex % 26),
          sortOrder: itemIndex + 1,
          status: (
            [
              "ACTIVE",
              "OUT_OF_STOCK",
              "HIDDEN",
              "SEASONAL",
              "DISCONTINUED",
            ] as const
          )[
            itemIndex < brand.menuItemCount - 4
              ? 0
              : 1 + (itemIndex - (brand.menuItemCount - 4))
          ]!,
          enableRecipeDeduction: true,
          isPublished: true,
          publishedAt: new Date(
            config.referenceTime.getTime() -
              (config.historyDays + 1) * 86400000,
          ),
        };
      },
    );
    for (let i = 0; i < itemRows.length; i += 250)
      await db.insert(menuItems).values(itemRows.slice(i, i + 250));

    const memberships = itemRows.map((item, index) => ({
      id: uuidFor(`menu-membership:${brand.key}:${index}`),
      menuId,
      menuItemId: item.id,
      categoryId: item.categoryId,
      sortOrder: index + 1,
    }));
    for (let i = 0; i < memberships.length; i += 500)
      await db.insert(menuMemberships).values(memberships.slice(i, i + 500));

    const variantItems = itemRows
      .filter((_, index) => index % 4 === 0)
      .slice(0, Math.max(4, Math.floor(itemRows.length / 5)));
    const variantRows = variantItems.flatMap((item, index) => [
      {
        id: uuidFor(`variant:${brand.key}:${index}:regular`),
        menuItemId: item.id,
        name: "Regular",
        price: item.basePrice,
        status: "ACTIVE" as const,
      },
      {
        id: uuidFor(`variant:${brand.key}:${index}:large`),
        menuItemId: item.id,
        name: "Large",
        price: money(Number(item.basePrice) * 1.28),
        status: "ACTIVE" as const,
      },
    ]);
    if (variantRows.length)
      await db.insert(menuItemVariants).values(variantRows);

    const modifierGroupId = uuidFor(`modifier-group:${brand.key}:addons`);
    await db.insert(modifierGroups).values({
      id: modifierGroupId,
      tenantId,
      name: "Popular Add-ons",
      selectionType: "MULTIPLE",
      groupType: "ADDON",
      minSelections: 0,
      maxSelections: 3,
      sortOrder: 1,
    });
    await db.insert(modifierOptions).values([
      {
        id: uuidFor(`modifier:${brand.key}:extra-cheese`),
        modifierGroupId,
        name: "Extra Cheese",
        additionalPrice: "59.00",
        maxQuantity: 2,
        sortOrder: 1,
      },
      {
        id: uuidFor(`modifier:${brand.key}:extra-protein`),
        modifierGroupId,
        name: "Extra Protein",
        additionalPrice: "99.00",
        maxQuantity: 2,
        sortOrder: 2,
      },
      {
        id: uuidFor(`modifier:${brand.key}:sauce`),
        modifierGroupId,
        name: "House Sauce",
        additionalPrice: "29.00",
        maxQuantity: 2,
        sortOrder: 3,
      },
    ]);
    await db.insert(menuItemModifierGroups).values(
      itemRows
        .filter(
          (_, index) =>
            index % 3 === 0 &&
            catalogItem(brand, brandIndex, index).station === "hot",
        )
        .map((item) => ({
          menuItemId: item.id,
          modifierGroupId,
          sortOrder: 1,
        })),
    );

    const allergenRows = await db.select().from(menuAllergens);
    const allergenByName = new Map(
      allergenRows.map((row) => [row.name, row.id]),
    );
    const links = itemRows.flatMap((item) => {
      const ingredients = recipeFor(item.name).map(([index]) => index);
      const labels = [
        ...(ingredients.some((index) => [3, 7, 8, 9, 10].includes(index))
          ? ["Dairy"]
          : []),
        ...(ingredients.includes(6) || ingredients.includes(19)
          ? ["Gluten"]
          : []),
      ];
      return labels.map((label) => {
        const id = allergenByName.get(label);
        if (!id) throw new Error(`Missing migrated allergen: ${label}`);
        return { menuItemId: item.id, allergenId: id };
      });
    });
    if (links.length) await db.insert(menuItemAllergens).values(links);
    const comboId = uuidFor(`combo:${brand.key}`);
    await db.insert(combos).values({
      id: comboId,
      tenantId,
      name: `${brand.name} House Pairing`,
      description: "Illustrative two-item demo pairing",
      pricePolicy: "FIXED",
      fixedPrice: money(
        (Number(itemRows[0]!.basePrice) + Number(itemRows[1]!.basePrice)) * 0.9,
      ),
    });
    for (let index = 0; index < 2; index++) {
      const slotId = uuidFor(`combo-slot:${brand.key}:${index}`);
      await db.insert(comboSlots).values({
        id: slotId,
        comboId,
        name: `Choice ${index + 1}`,
        minSelections: 1,
        maxSelections: 1,
        sortOrder: index,
      });
      await db.insert(comboSlotOptions).values({
        id: uuidFor(`combo-option:${brand.key}:${index}`),
        slotId,
        menuItemId: itemRows[index]!.id,
        variantId:
          index === 0 ? uuidFor(`variant:${brand.key}:0:regular`) : null,
      });
    }

    // Routes are tenant-level, while this menu is shared across branches.
    // Keep new orders unrouted (supported by KDS) instead of pinning all branches to branch 1.
  }
};
