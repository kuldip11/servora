import { asc } from "drizzle-orm";
import type { MenuItemStatus } from "@pos/types";
import { db } from "@/db";
import { menuItemImages, modifierOptions } from "@/db/schema";
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

export function withItemReadModel<
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
