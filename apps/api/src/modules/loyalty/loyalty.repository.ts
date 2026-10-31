import { loyaltyCustomerRepository } from "./loyalty-customer.repository";
import { organizationLoyaltyRepository } from "./organization-loyalty.repository";
import { tenantLoyaltyRepository } from "./tenant-loyalty.repository";

export type {
  CustomerRow,
  LoyaltyTierRow,
  NewCustomer,
  NewLoyaltyTier,
} from "./loyalty.repository.types";

export const loyaltyRepository = {
  ...tenantLoyaltyRepository,
  ...organizationLoyaltyRepository,
  ...loyaltyCustomerRepository,
};
