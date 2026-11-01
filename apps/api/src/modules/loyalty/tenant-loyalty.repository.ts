import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { customerLoyaltyTiers, customers, tenants } from "@/db/schema";
import { compact } from "@/lib/object-utils";
import type { NewLoyaltyTier } from "./loyalty.repository.types";

export const tenantLoyaltyRepository = {
  async listApplicableTiers(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { organizationId: true },
    });
    return db.query.customerLoyaltyTiers.findMany({
      where: or(
        eq(customerLoyaltyTiers.tenantId, tenantId),
        tenant?.organizationId
          ? eq(customerLoyaltyTiers.organizationId, tenant.organizationId)
          : undefined,
      ),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  },
  async findApplicableTier(tenantId: string, id: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { organizationId: true },
    });
    return db.query.customerLoyaltyTiers.findFirst({
      where: and(
        eq(customerLoyaltyTiers.id, id),
        or(
          eq(customerLoyaltyTiers.tenantId, tenantId),
          tenant?.organizationId
            ? eq(customerLoyaltyTiers.organizationId, tenant.organizationId)
            : undefined,
        ),
      ),
    });
  },
  listTiers(tenantId: string) {
    return db.query.customerLoyaltyTiers.findMany({
      where: eq(customerLoyaltyTiers.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  },
  findTier(tenantId: string, id: string) {
    return db.query.customerLoyaltyTiers.findFirst({
      where: and(
        eq(customerLoyaltyTiers.tenantId, tenantId),
        eq(customerLoyaltyTiers.id, id),
      ),
    });
  },
  async createTier(data: NewLoyaltyTier) {
    const [row] = await db
      .insert(customerLoyaltyTiers)
      .values(data)
      .returning();
    return row!;
  },
  async updateTier(
    tenantId: string,
    id: string,
    data: Partial<NewLoyaltyTier>,
  ) {
    const [row] = await db
      .update(customerLoyaltyTiers)
      .set(compact({ ...data, updatedAt: new Date() }))
      .where(
        and(
          eq(customerLoyaltyTiers.tenantId, tenantId),
          eq(customerLoyaltyTiers.id, id),
        ),
      )
      .returning();
    return row;
  },
  async removeTier(tenantId: string, id: string) {
    await db
      .delete(customerLoyaltyTiers)
      .where(
        and(
          eq(customerLoyaltyTiers.tenantId, tenantId),
          eq(customerLoyaltyTiers.id, id),
        ),
      );
  },
  listCustomers(tenantId: string) {
    return db.query.customers.findMany({
      where: eq(customers.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
      with: { loyaltyTier: true },
    });
  },
  findCustomer(tenantId: string, id: string) {
    return db.query.customers.findFirst({
      where: and(eq(customers.tenantId, tenantId), eq(customers.id, id)),
      with: { loyaltyTier: true },
    });
  },
};
