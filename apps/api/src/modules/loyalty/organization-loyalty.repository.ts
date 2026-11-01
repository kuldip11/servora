import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { customerLoyaltyTiers, customers, tenants } from "@/db/schema";
import { compact } from "@/lib/object-utils";
import type { NewLoyaltyTier } from "./loyalty.repository.types";

export const organizationLoyaltyRepository = {
  async findOrganizationTierForCustomer(tenantId: string, customerId: string) {
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.tenantId, tenantId),
        eq(customers.id, customerId),
      ),
    });
    if (!customer) return undefined;
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { organizationId: true },
    });
    if (!tenant?.organizationId) return undefined;

    const candidateRows = await db
      .select({ id: customers.id })
      .from(customers)
      .innerJoin(tenants, eq(tenants.id, customers.tenantId))
      .where(
        and(
          eq(tenants.organizationId, tenant.organizationId),
          or(
            customer.organizationCustomerId
              ? eq(
                  customers.organizationCustomerId,
                  customer.organizationCustomerId,
                )
              : undefined,
            customer.phone ? eq(customers.phone, customer.phone) : undefined,
            eq(customers.id, customer.id),
          ),
        ),
      );
    if (!candidateRows.length) return undefined;
    const identityCandidates = await db.query.customers.findMany({
      where: inArray(
        customers.id,
        candidateRows.map((candidate) => candidate.id),
      ),
      with: { loyaltyTier: true },
    });
    return identityCandidates
      .map((candidate) => candidate.loyaltyTier)
      .find((tier) => tier?.organizationId === tenant.organizationId);
  },
  listOrganizationTiers(organizationId: string) {
    return db.query.customerLoyaltyTiers.findMany({
      where: eq(customerLoyaltyTiers.organizationId, organizationId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  },
  async createOrganizationTier(
    organizationId: string,
    data: Omit<NewLoyaltyTier, "tenantId" | "organizationId">,
  ) {
    const [row] = await db
      .insert(customerLoyaltyTiers)
      .values({ ...data, tenantId: null, organizationId })
      .returning();
    return row!;
  },
  findOrganizationTier(organizationId: string, id: string) {
    return db.query.customerLoyaltyTiers.findFirst({
      where: and(
        eq(customerLoyaltyTiers.organizationId, organizationId),
        eq(customerLoyaltyTiers.id, id),
      ),
    });
  },
  async updateOrganizationTier(
    organizationId: string,
    id: string,
    data: Partial<NewLoyaltyTier>,
  ) {
    const [row] = await db
      .update(customerLoyaltyTiers)
      .set(
        compact({
          ...data,
          tenantId: null,
          organizationId,
          updatedAt: new Date(),
        }),
      )
      .where(
        and(
          eq(customerLoyaltyTiers.organizationId, organizationId),
          eq(customerLoyaltyTiers.id, id),
        ),
      )
      .returning();
    return row;
  },
  async removeOrganizationTier(organizationId: string, id: string) {
    await db
      .delete(customerLoyaltyTiers)
      .where(
        and(
          eq(customerLoyaltyTiers.organizationId, organizationId),
          eq(customerLoyaltyTiers.id, id),
        ),
      );
  },
};
