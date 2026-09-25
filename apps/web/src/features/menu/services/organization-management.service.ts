import { createMenuApi, createOrganizationsApi } from "@pos/api-client";
import type { CustomerLoyaltyTier, PriceRule } from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";
import type {
  OrgMenu,
  OrganizationSummary,
  OrganizationTenantSummary,
} from "@/features/menu/components/organization-management/types";

const organizationsApi = createOrganizationsApi(apiClient);
const menuApi = createMenuApi(apiClient);

export const organizationManagementService = {
  listOrganizations: () => organizationsApi.list<OrganizationSummary>(),
  listTenants: (organizationId: string) =>
    organizationsApi.tenants<OrganizationTenantSummary>(organizationId),
  listMenus: (organizationId: string) =>
    organizationsApi.menus<OrgMenu>(organizationId),
  listPriceRules: (organizationId: string) =>
    menuApi.listPriceRulesFor<PriceRule>({ organizationId }),
  listLoyaltyTiers: (organizationId: string) =>
    organizationsApi.loyaltyTiers<CustomerLoyaltyTier>(organizationId),
  createMenu: (
    organizationId: string,
    input: {
      name: string;
      status: "DRAFT" | "PUBLISHED";
      isDefault: boolean;
      items: Array<{ itemSku: string; sortOrder: number }>;
    },
  ) => organizationsApi.createMenu<OrgMenu>(organizationId, input),
  updateMenu: (
    organizationId: string,
    menuId: string,
    input: { status: "DRAFT" | "PUBLISHED" },
  ) => organizationsApi.updateMenu<OrgMenu>(organizationId, menuId, input),
  removeMenu: (organizationId: string, menuId: string) =>
    organizationsApi.removeMenu(organizationId, menuId),
  createPriceRule: (
    organizationId: string,
    menuItemSku: string,
    price: number,
  ) =>
    menuApi.createPriceRule<PriceRule>({
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
  ) =>
    organizationsApi.createLoyaltyTier<CustomerLoyaltyTier>(
      organizationId,
      input,
    ),
  removeLoyaltyTier: (organizationId: string, id: string) =>
    organizationsApi.removeLoyaltyTier(organizationId, id),
};
