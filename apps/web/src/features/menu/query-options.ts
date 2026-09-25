import { queryOptions } from "@tanstack/react-query";
import { menuItemsService } from "./services/menu-items.service";
import { menusService } from "./services/menus.service";
import { menuTagsService } from "./services/menu-tags.service";
import { modifierGroupsService } from "./services/modifier-groups.service";
import { menuAllergensService } from "./services/menu-allergens.service";
import { menuHolidaysService } from "./services/menu-holidays.service";
import { menuTemplatesService } from "./services/menu-templates.service";
import { menuSchedulesService } from "./services/menu-schedules.service";
import { menuRecipesService } from "./services/menu-recipes.service";
import { menuBranchOverridesService } from "./services/menu-branch-overrides.service";
import { kitchenStationsService } from "./services/kitchen-stations.service";
import { menuCombosService } from "./services/menu-combos.service";
import { menuPromotionsService } from "./services/menu-promotions.service";
import { menuPricingService } from "./services/menu-pricing.service";
import { menuChannelOverridesService } from "./services/menu-channel-overrides.service";
import { menuLoyaltyService } from "./services/menu-loyalty.service";
import { menuKeys } from "./query-keys";
import { queryFreshness } from "@/shared/lib/query-policy";

export const menuCategoriesQuery = () => {
  return queryOptions({
    queryKey: menuKeys.categories(),
    queryFn: () => menuItemsService.listCategories(),
    staleTime: queryFreshness.semiStatic,
  });
};

export const menuTagsQuery = () => {
  return queryOptions({
    queryKey: menuKeys.tags(),
    queryFn: () => menuTagsService.list(),
    staleTime: queryFreshness.reference,
  });
};

export const modifierGroupsQuery = () => {
  return queryOptions({
    queryKey: menuKeys.modifierGroups(),
    queryFn: () => modifierGroupsService.list(),
    staleTime: queryFreshness.semiStatic,
  });
};

export const menuAllergensQuery = () => {
  return queryOptions({
    queryKey: menuKeys.allergens(),
    queryFn: () => menuAllergensService.list(),
    staleTime: queryFreshness.reference,
  });
};

export const menuHolidaysQuery = () => {
  return queryOptions({
    queryKey: menuKeys.holidays(),
    queryFn: () => menuHolidaysService.list(),
    staleTime: queryFreshness.reference,
  });
};

export const menuTemplatesQuery = () => {
  return queryOptions({
    queryKey: menuKeys.templates(),
    queryFn: () => menuTemplatesService.list(),
    staleTime: queryFreshness.reference,
  });
};

export const menuItemSchedulesQuery = (itemId: string) => {
  return queryOptions({
    queryKey: menuKeys.itemSchedules(itemId),
    queryFn: () => menuSchedulesService.list(itemId),
    enabled: Boolean(itemId),
  });
};

export const menuItemRecipeQuery = (itemId: string) => {
  return queryOptions({
    queryKey: menuKeys.itemRecipe(itemId),
    queryFn: () => menuRecipesService.get(itemId),
    enabled: Boolean(itemId),
  });
};

export const menuItemBranchOverridesQuery = (itemId: string) => {
  return queryOptions({
    queryKey: menuKeys.branchOverrides(itemId),
    queryFn: () => menuBranchOverridesService.list(itemId),
    enabled: Boolean(itemId),
  });
};

export const activeMenusQuery = (orderType: string) => {
  return queryOptions({
    queryKey: menuKeys.activeMenus(orderType),
    queryFn: () => menusService.listActive(orderType),
    staleTime: queryFreshness.transactional,
  });
};

export const menuCombosQuery = () =>
  queryOptions({
    queryKey: menuKeys.combos(),
    queryFn: menuCombosService.list,
  });

export const kitchenStationsQuery = () =>
  queryOptions({
    queryKey: menuKeys.kitchenStations(),
    queryFn: kitchenStationsService.list,
  });

export const itemStationRoutesQuery = (itemId: string) =>
  queryOptions({
    queryKey: menuKeys.stationRoutes(itemId),
    queryFn: () => kitchenStationsService.routes(itemId),
    enabled: Boolean(itemId),
  });

export const promotionsQuery = () =>
  queryOptions({
    queryKey: menuKeys.promotions(),
    queryFn: menuPromotionsService.list,
  });

export const promotionStatsQuery = (promotionId: string) =>
  queryOptions({
    queryKey: menuKeys.promotionStats(promotionId),
    queryFn: () => menuPromotionsService.stats(promotionId),
    enabled: Boolean(promotionId),
  });

export const perCoverPriceRulesQuery = () =>
  queryOptions({
    queryKey: menuKeys.perCoverPriceRules(),
    queryFn: () => menuPricingService.list(),
  });

export const channelOverridesQuery = (itemId: string) =>
  queryOptions({
    queryKey: menuKeys.channelOverrides(itemId),
    queryFn: () => menuChannelOverridesService.list(itemId),
    enabled: Boolean(itemId),
  });

export const menuSchedulesQuery = (menuId: string) =>
  queryOptions({
    queryKey: menuKeys.menuSchedules(menuId),
    queryFn: () => menuSchedulesService.listMenuSchedules(menuId),
    enabled: Boolean(menuId),
  });

export const loyaltyTiersQuery = () =>
  queryOptions({
    queryKey: menuKeys.loyaltyTiers(),
    queryFn: menuLoyaltyService.listTiers,
  });

export const loyaltyCustomersQuery = () =>
  queryOptions({
    queryKey: menuKeys.loyaltyCustomers(),
    queryFn: menuLoyaltyService.listCustomers,
  });

export const customerGroupsQuery = () =>
  queryOptions({
    queryKey: menuKeys.customerGroups(),
    queryFn: ({ signal }) => menuLoyaltyService.listGroups(signal),
  });

export const itemPriceRulesQuery = (itemId: string) =>
  queryOptions({
    queryKey: menuKeys.itemPriceRules(itemId),
    queryFn: () => menuPricingService.list({ menuItemId: itemId }),
    enabled: Boolean(itemId),
  });
