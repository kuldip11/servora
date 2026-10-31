import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, tenants } from "@/db/schema";
import { compact } from "@/lib/object-utils";
import type { NewCustomer } from "./loyalty.repository.types";

export const loyaltyCustomerRepository = {
  async findCustomersByPhone(tenantId: string, phone: string) {
    const local = await db.query.customers.findMany({
      where: and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)),
      with: { loyaltyTier: true },
      limit: 2,
    });
    if (local.length || !phone) return local;

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { organizationId: true },
    });
    if (!tenant?.organizationId) return [];

    const siblingRows = await db
      .select({
        id: customers.id,
        tenantId: customers.tenantId,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        organizationCustomerId: customers.organizationCustomerId,
      })
      .from(customers)
      .innerJoin(tenants, eq(tenants.id, customers.tenantId))
      .where(
        and(
          eq(tenants.organizationId, tenant.organizationId),
          eq(customers.phone, phone),
        ),
      )
      .limit(2);
    if (siblingRows.length !== 1) return [];

    const sibling = siblingRows[0]!;
    const identityId = sibling.organizationCustomerId ?? sibling.id;
    if (!sibling.organizationCustomerId) {
      await db
        .update(customers)
        .set({ organizationCustomerId: identityId, updatedAt: new Date() })
        .where(
          and(
            eq(customers.tenantId, sibling.tenantId),
            eq(customers.id, sibling.id),
          ),
        );
    }

    const concurrentlyCreated = await db.query.customers.findMany({
      where: and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)),
      with: { loyaltyTier: true },
      limit: 2,
    });
    if (concurrentlyCreated.length) return concurrentlyCreated;

    const [created] = await db
      .insert(customers)
      .values({
        tenantId,
        name: sibling.name,
        email: sibling.email,
        phone,
        organizationCustomerId: identityId,
        loyaltyTierId: null,
      })
      .returning();
    if (!created) return [];
    const hydrated = await db.query.customers.findFirst({
      where: and(
        eq(customers.tenantId, tenantId),
        eq(customers.id, created.id),
      ),
      with: { loyaltyTier: true },
    });
    return hydrated ? [hydrated] : [];
  },
  async findOrganizationCustomerIdentity(tenantId: string, phone: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { organizationId: true },
    });
    if (!tenant?.organizationId) return null;
    const [match] = await db
      .select({
        id: customers.id,
        tenantId: customers.tenantId,
        organizationCustomerId: customers.organizationCustomerId,
      })
      .from(customers)
      .innerJoin(tenants, eq(tenants.id, customers.tenantId))
      .where(
        and(
          eq(tenants.organizationId, tenant.organizationId),
          eq(customers.phone, phone),
        ),
      )
      .limit(1);
    if (!match) return null;
    const identityId = match.organizationCustomerId ?? match.id;

    if (!match.organizationCustomerId) {
      await db
        .update(customers)
        .set({ organizationCustomerId: identityId, updatedAt: new Date() })
        .where(
          and(
            eq(customers.tenantId, match.tenantId),
            eq(customers.id, match.id),
          ),
        );
    }
    return identityId;
  },
  async setOrganizationCustomerIdentity(
    tenantId: string,
    customerId: string,
    organizationCustomerId: string | null,
  ) {
    const [row] = await db
      .update(customers)
      .set({ organizationCustomerId, updatedAt: new Date() })
      .where(
        and(eq(customers.tenantId, tenantId), eq(customers.id, customerId)),
      )
      .returning();
    return row;
  },
  async createCustomer(data: NewCustomer) {
    const [row] = await db.insert(customers).values(data).returning();
    return row!;
  },
  async updateCustomer(
    tenantId: string,
    id: string,
    data: Partial<NewCustomer>,
  ) {
    const [row] = await db
      .update(customers)
      .set(compact({ ...data, updatedAt: new Date() }))
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning();
    return row;
  },
};
