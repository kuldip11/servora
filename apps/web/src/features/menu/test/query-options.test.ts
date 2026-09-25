import { describe, expect, it, vi } from "vitest";

const serviceFns = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listTags: vi.fn(),
  listModifiers: vi.fn(),
  listAllergens: vi.fn(),
  listHolidays: vi.fn(),
  listTemplates: vi.fn(),
  listSchedules: vi.fn(),
  getRecipe: vi.fn(),
  listOverrides: vi.fn(),
  listActive: vi.fn(),
  listCombos: vi.fn(),
  listStations: vi.fn(),
  listRoutes: vi.fn(),
  listPromotions: vi.fn(),
  promotionStats: vi.fn(),
  listPriceRules: vi.fn(),
  listChannelOverrides: vi.fn(),
}));

vi.mock("../services/menus.service", () => ({
  menusService: { listActive: serviceFns.listActive },
}));
vi.mock("../services/menu-items.service", () => ({
  menuItemsService: { listCategories: serviceFns.listCategories },
}));
vi.mock("../services/menu-tags.service", () => ({
  menuTagsService: { list: serviceFns.listTags },
}));
vi.mock("../services/modifier-groups.service", () => ({
  modifierGroupsService: { list: serviceFns.listModifiers },
}));
vi.mock("../services/menu-allergens.service", () => ({
  menuAllergensService: { list: serviceFns.listAllergens },
}));
vi.mock("../services/menu-holidays.service", () => ({
  menuHolidaysService: { list: serviceFns.listHolidays },
}));
vi.mock("../services/menu-templates.service", () => ({
  menuTemplatesService: { list: serviceFns.listTemplates },
}));
vi.mock("../services/menu-schedules.service", () => ({
  menuSchedulesService: { list: serviceFns.listSchedules },
}));
vi.mock("../services/menu-recipes.service", () => ({
  menuRecipesService: { get: serviceFns.getRecipe },
}));
vi.mock("../services/menu-branch-overrides.service", () => ({
  menuBranchOverridesService: { list: serviceFns.listOverrides },
}));
vi.mock("../services/menu-combos.service", () => ({
  menuCombosService: { list: serviceFns.listCombos },
}));
vi.mock("../services/kitchen-stations.service", () => ({
  kitchenStationsService: {
    list: serviceFns.listStations,
    routes: serviceFns.listRoutes,
  },
}));
vi.mock("../services/menu-promotions.service", () => ({
  menuPromotionsService: {
    list: serviceFns.listPromotions,
    stats: serviceFns.promotionStats,
  },
}));
vi.mock("../services/menu-pricing.service", () => ({
  menuPricingService: { list: serviceFns.listPriceRules },
}));
vi.mock("../services/menu-channel-overrides.service", () => ({
  menuChannelOverridesService: { list: serviceFns.listChannelOverrides },
}));
vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import {
  activeMenusQuery,
  menuCategoriesQuery,
  menuTagsQuery,
  modifierGroupsQuery,
  menuAllergensQuery,
  menuHolidaysQuery,
  menuTemplatesQuery,
  menuItemSchedulesQuery,
  menuItemRecipeQuery,
  menuItemBranchOverridesQuery,
  menuCombosQuery,
  kitchenStationsQuery,
  itemStationRoutesQuery,
  promotionsQuery,
  promotionStatsQuery,
  perCoverPriceRulesQuery,
  channelOverridesQuery,
} from "@/features/menu/query-options";

describe("menu query definitions", () => {
  it("binds categories, tags, modifiers, allergens, holidays, and templates", () => {
    expect(menuCategoriesQuery().queryFn).toEqual(expect.any(Function));
    expect(menuTagsQuery().queryFn).toEqual(expect.any(Function));
    expect(modifierGroupsQuery().queryFn).toEqual(expect.any(Function));
    expect(menuAllergensQuery().queryFn).toEqual(expect.any(Function));
    expect(menuHolidaysQuery().queryFn).toEqual(expect.any(Function));
    expect(menuTemplatesQuery().queryFn).toEqual(expect.any(Function));
  });

  it("uses the documented freshness windows", () => {
    expect(menuCategoriesQuery().staleTime).toBe(300_000);
    expect(menuTagsQuery().staleTime).toBe(600_000);
    expect(modifierGroupsQuery().staleTime).toBe(300_000);
    expect(menuAllergensQuery().staleTime).toBe(600_000);
    expect(menuHolidaysQuery().staleTime).toBe(600_000);
    expect(menuTemplatesQuery().staleTime).toBe(600_000);
  });

  it("captures item ids in item-specific query keys and delegates through a function", () => {
    expect(menuItemSchedulesQuery("item-1").queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "item-schedules",
      "item-1",
    ]);
    expect(menuItemRecipeQuery("item-1").queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "item-recipe",
      "item-1",
    ]);
    expect(menuItemBranchOverridesQuery("item-1").queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "branch-overrides",
      "item-1",
    ]);
    expect(menuItemSchedulesQuery("item-1").queryFn).toEqual(
      expect.any(Function),
    );
    expect(menuItemRecipeQuery("item-1").queryFn).toEqual(expect.any(Function));
    expect(menuItemBranchOverridesQuery("item-1").queryFn).toEqual(
      expect.any(Function),
    );
  });

  it("binds combos and kitchen routing to branch-scoped keys", () => {
    expect(menuCombosQuery().queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "combos",
    ]);
    expect(kitchenStationsQuery().queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "kitchen-stations",
    ]);
    expect(itemStationRoutesQuery("item-1").queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "kitchen-stations",
      "routes",
      "item-1",
    ]);
  });

  it("binds promotions and promotion stats to scoped keys", () => {
    expect(promotionsQuery().queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "promotions",
    ]);
    expect(promotionStatsQuery("promo-1").queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "promotions",
      "promo-1",
      "stats",
    ]);
  });

  it("binds buffet pricing and channel overrides to branch-scoped keys", () => {
    expect(perCoverPriceRulesQuery().queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "per-cover-price-rules",
    ]);
    expect(channelOverridesQuery("item-1").queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "channel-overrides",
      "item-1",
    ]);
  });

  it("binds active menus to the scoped menu service", () => {
    const query = activeMenusQuery("DINE_IN");
    expect(query.queryKey).toEqual([
      "menu",
      "branch-context",
      "fr-1",
      "br-1",
      "active-menus",
      "DINE_IN",
    ]);
    expect(query.queryFn).toEqual(expect.any(Function));
    expect(query.staleTime).toBe(60_000);
  });
});
