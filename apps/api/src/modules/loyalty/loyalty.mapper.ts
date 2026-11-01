import type {
  LoyaltyCustomerResponse,
  LoyaltyTierResponse,
} from "@pos/contracts";
import { customerLoyaltyTiers, customers } from "@/db/schema";

type LoyaltyTierRecord = typeof customerLoyaltyTiers.$inferSelect;
type CustomerRecord = typeof customers.$inferSelect & {
  loyaltyTier?: LoyaltyTierRecord | null;
};

export const toLoyaltyTierResponse = (
  tier: LoyaltyTierRecord,
): LoyaltyTierResponse => ({
  id: tier.id,
  tenantId: tier.tenantId,
  organizationId: tier.organizationId,
  name: tier.name,
  discountPercent: tier.discountPercent,
  discountFixed: tier.discountFixed,
  createdAt: tier.createdAt.toISOString(),
  updatedAt: tier.updatedAt.toISOString(),
});

export const toLoyaltyCustomerResponse = (
  customer: CustomerRecord,
): LoyaltyCustomerResponse => ({
  id: customer.id,
  tenantId: customer.tenantId,
  organizationCustomerId: customer.organizationCustomerId,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  loyaltyTierId: customer.loyaltyTierId,
  ...(customer.loyaltyTier !== undefined
    ? {
        loyaltyTier: customer.loyaltyTier
          ? toLoyaltyTierResponse(customer.loyaltyTier)
          : null,
      }
    : {}),
});
