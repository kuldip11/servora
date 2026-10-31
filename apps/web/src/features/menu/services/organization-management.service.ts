import { createMenuApi, createOrganizationsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const organizationsApi = createOrganizationsApi(apiClient);
const menuApi = createMenuApi(apiClient);

export const organizationManagementService = {
  listOrganizations: () => organizationsApi.list(),
  listTenants: (organizationId: string) =>
    organizationsApi.tenants(organizationId),
  listMenus: (organizationId: string) => organizationsApi.menus(organizationId),
  listPriceRules: (organizationId: string) =>
    menuApi.listPriceRulesFor({ organizationId }),
  listLoyaltyTiers: (organizationId: string) =>
    organizationsApi.loyaltyTiers(organizationId),
  createMenu: (
    organizationId: string,
    input: {
      name: string;
      status: "DRAFT" | "PUBLISHED";
      isDefault: boolean;
      items: Array<{ itemSku: string; sortOrder: number }>;
    },
  ) => organizationsApi.createMenu(organizationId, input),
  updateMenu: (
    organizationId: string,
    menuId: string,
    input: { status: "DRAFT" | "PUBLISHED" },
  ) => organizationsApi.updateMenu(organizationId, menuId, input),
  removeMenu: (organizationId: string, menuId: string) =>
    organizationsApi.removeMenu(organizationId, menuId),
  createPriceRule: (
    organizationId: string,
    menuItemSku: string,
    price: number,
  ) =>
    menuApi.createPriceRule({
      organizationId,
      menuItemSku,
      price,
      priority: 0,
    }),
  removePriceRule: (id: string) => menuApi.removePriceRule(id),
  createLoyaltyTier: (
    organizationId: string,
    input: {
      name: string;
      discountPercent?: number;
      discountFixed?: number;
    },
  ) => organizationsApi.createLoyaltyTier(organizationId, input),
  removeLoyaltyTier: (organizationId: string, id: string) =>
    organizationsApi.removeLoyaltyTier(organizationId, id),
};
