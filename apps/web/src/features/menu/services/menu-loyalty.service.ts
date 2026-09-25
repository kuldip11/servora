import { createCustomersApi, createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type {
  CustomerGroup,
  CustomerLoyaltyTier,
  LoyaltyCustomer,
} from "@pos/types";

const menuApi = createMenuApi(apiClient);
const customersApi = createCustomersApi(apiClient);

export const menuLoyaltyService = {
  listTiers: () => menuApi.listLoyaltyTiers<CustomerLoyaltyTier>(),
  createTier: (input: Record<string, unknown>) =>
    menuApi.createLoyaltyTier<CustomerLoyaltyTier>(input),
  removeTier: menuApi.removeLoyaltyTier,
  listCustomers: customersApi.list,
  createCustomer: customersApi.create,
  assignTier: customersApi.assignTier,
  listGroups: customersApi.listGroups,
  createGroup: customersApi.createGroup,
  updateGroup: customersApi.updateGroup,
  deleteGroup: customersApi.deleteGroup,
};

export type MenuLoyaltyTier = CustomerLoyaltyTier;
export type MenuLoyaltyCustomer = LoyaltyCustomer;
export type MenuCustomerGroup = CustomerGroup;
