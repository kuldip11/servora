import {
  branchQueryContextKey,
  franchiseQueryContextKey,
} from "@/shared/lib/query-context";

export const menuKeys = {
  all: ["menu"] as const,
  menus: () =>
    [...menuKeys.all, ...franchiseQueryContextKey(), "menus"] as const,
  activeMenus: (orderType: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "active-menus",
      orderType,
    ] as const,
  categories: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "categories"] as const,
  tags: () => [...menuKeys.all, ...franchiseQueryContextKey(), "tags"] as const,
  allergens: () =>
    [...menuKeys.all, ...franchiseQueryContextKey(), "allergens"] as const,
  modifierGroups: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "modifier-groups"] as const,
  combos: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "combos"] as const,
  promotions: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "promotions"] as const,
  perCoverPriceRules: () =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "per-cover-price-rules",
    ] as const,
  channelOverrides: (itemId: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "channel-overrides",
      itemId,
    ] as const,
  promotionStats: (promotionId: string) =>
    [...menuKeys.promotions(), promotionId, "stats"] as const,
  kitchenStations: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "kitchen-stations"] as const,
  stationRoutes: (itemId: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "kitchen-stations",
      "routes",
      itemId,
    ] as const,
  holidays: () =>
    [...menuKeys.all, ...franchiseQueryContextKey(), "holidays"] as const,
  templates: () =>
    [...menuKeys.all, ...franchiseQueryContextKey(), "templates"] as const,
  itemSchedules: (itemId: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "item-schedules",
      itemId,
    ] as const,
  itemRecipe: (itemId: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "item-recipe",
      itemId,
    ] as const,
  branchOverrides: (itemId: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "branch-overrides",
      itemId,
    ] as const,
  menuSchedules: (menuId: string) =>
    [
      ...menuKeys.all,
      ...franchiseQueryContextKey(),
      "menu-schedules",
      menuId,
    ] as const,
  loyaltyTiers: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "loyalty-tiers"] as const,
  loyaltyCustomers: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "loyalty-customers"] as const,
  customerGroups: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "customer-groups"] as const,
  itemPriceRules: (itemId: string) =>
    [
      ...menuKeys.all,
      ...branchQueryContextKey(),
      "item-price-rules",
      itemId,
    ] as const,
  subRecipes: () =>
    [...menuKeys.all, ...branchQueryContextKey(), "sub-recipes"] as const,
  organizations: () => [...menuKeys.all, "organizations"] as const,
  organizationTenants: (organizationId: string) =>
    [...menuKeys.organizations(), organizationId, "tenants"] as const,
  organizationMenus: (organizationId: string) =>
    [...menuKeys.organizations(), organizationId, "menus"] as const,
  organizationPriceRules: (organizationId: string) =>
    [...menuKeys.organizations(), organizationId, "price-rules"] as const,
  organizationLoyaltyTiers: (organizationId: string) =>
    [...menuKeys.organizations(), organizationId, "loyalty-tiers"] as const,
};
