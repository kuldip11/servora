import {
  createCustomersApi,
  createMenuApi,
  type CustomerGroupDto,
  type LoyaltyCustomerDto,
  type MenuLoyaltyTierDto,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
const customersApi = createCustomersApi(apiClient);

export const menuLoyaltyService = {
  listTiers: () => menuApi.listLoyaltyTiers(),
  createTier: (input: Parameters<typeof menuApi.createLoyaltyTier>[0]) =>
    menuApi.createLoyaltyTier(input),
  removeTier: menuApi.removeLoyaltyTier,
  listCustomers: customersApi.list,
  createCustomer: customersApi.create,
  assignTier: customersApi.assignTier,
  listGroups: customersApi.listGroups,
  createGroup: customersApi.createGroup,
  updateGroup: customersApi.updateGroup,
  deleteGroup: customersApi.deleteGroup,
};

export type MenuLoyaltyTier = MenuLoyaltyTierDto;
export type MenuLoyaltyCustomer = LoyaltyCustomerDto;
export type MenuCustomerGroup = CustomerGroupDto;
