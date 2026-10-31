import { customerLoyaltyTiers, customers } from "@/db/schema";

export type LoyaltyTierRow = Omit<
  typeof customerLoyaltyTiers.$inferSelect,
  "organizationId"
> & { organizationId?: string | null };
export type CustomerRow = typeof customers.$inferSelect;
export type NewLoyaltyTier = typeof customerLoyaltyTiers.$inferInsert;
export type NewCustomer = typeof customers.$inferInsert;
