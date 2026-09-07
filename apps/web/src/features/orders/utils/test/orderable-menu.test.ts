import { describe, expect, it } from "vitest";
import type { MenuCategory, MenuItem } from "@pos/types";
import {
  isOrderableMenuItem,
  scopeCategoriesForOrder,
} from "@/features/orders/utils/orderable-menu";

const item = (overrides: Partial<MenuItem> = {}): MenuItem =>
  ({
    id: "item-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    categoryId: "category-1",
    name: "Chicken Tikka",
    description: null,
    basePrice: 220,
    pricingMode: "FIXED",
    weightUnit: null,
    openPriceMin: null,
    openPriceMax: null,
    supportsZones: false,
    zonePricingRule: "HIGHER",
    manualStockCount: null,
    taxRate: 5,
    taxMode: "EXCLUSIVE",
    imageUrl: null,
    foodType: "NON_VEG",
    spiceLevel: null,
    sku: null,
    prepTimeMinutes: null,
    sortOrder: 0,
    hsnCode: null,
    status: "ACTIVE",
    availabilityReason: null,
    statusChangedAt: "2026-09-01T00:00:00.000Z",
    manualOverrideStatus: null,
    manualOverrideReason: null,
    manualOverrideSetBy: null,
    manualOverrideSetAt: null,
    enableRecipeDeduction: true,
    displayMode: "STANDARD",
    effectiveFrom: null,
    isPublished: true,
    publishedAt: "2026-09-01T00:00:00.000Z",
    variants: [],
    images: [],
    modifierGroupLinks: [],
    tagLinks: [],
    allergenLinks: [],
    recipeLinks: [],
    menuMemberships: [],
    isAvailable: true,
    ...overrides,
  }) as MenuItem;

const categories = (items: MenuItem[]): MenuCategory[] =>
  [
    {
      id: "category-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      name: "North Indian",
      description: null,
      sortOrder: 0,
      isActive: true,
      menuItems: items,
    },
  ] as MenuCategory[];

const menus = (ids: string[]) => [
  {
    id: "default-menu",
    memberships: ids.map((menuItemId) => ({ menuItemId })),
  },
];

describe("orderable menu filtering", () => {
  it("keeps the normal category -> item -> order journey visible", () => {
    const result = scopeCategoriesForOrder(
      categories([item()]),
      menus(["item-1"]),
      "default-menu",
      new Date("2026-09-01T01:00:00.000Z"),
    );

    expect(result).toHaveLength(1);
    expect(result?.[0]?.menuItems.map((menuItem) => menuItem.name)).toEqual([
      "Chicken Tikka",
    ]);
  });

  it.each([
    ["draft", { isPublished: false }],
    ["hidden", { status: "HIDDEN" }],
    ["out of stock", { status: "OUT_OF_STOCK", isAvailable: false }],
    ["computed unavailable", { isAvailable: false }],
    ["future effective date", { effectiveFrom: "2026-09-02T00:00:00.000Z" }],
  ])("hides a %s item from the order picker", (_name, overrides) => {
    expect(
      isOrderableMenuItem(
        item(overrides as Partial<MenuItem>),
        new Date("2026-09-01T01:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("does not leak an item from another active menu selection", () => {
    const result = scopeCategoriesForOrder(
      categories([item(), item({ id: "item-2", name: "Paneer Tikka" })]),
      [
        { id: "menu-a", memberships: [{ menuItemId: "item-1" }] },
        { id: "menu-b", memberships: [{ menuItemId: "item-2" }] },
      ],
      "menu-a",
    );

    expect(result?.[0]?.menuItems.map((menuItem) => menuItem.id)).toEqual([
      "item-1",
    ]);
  });
});
