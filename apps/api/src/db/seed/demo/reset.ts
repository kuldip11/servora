import { and, eq, inArray, sql } from "drizzle-orm";
import {
  organizations,
  combos,
  promotionRedemptions,
  paymentRefunds,
  billOrderItems,
  bills,
  orderInventoryDeductions,
  orderItems,
  orderItemModifiers,
  orderStatusHistory,
  kitchenTickets,
  tenants,
  users,
  orders,
  payments,
  inventoryItems,
  inventoryTransactions,
} from "@/db/schema";
import type { SeedDatabase } from "./types";
import { buildBrands } from "./data/brands";
import {
  assertDemoEnvironment,
  DEMO_EMAIL,
  DEMO_ORG_NAME,
  uuidFor,
} from "./utils";

/** Called inside the seed/reset transaction. Never changes database triggers. */
export const resetDemoData = async (
  db: SeedDatabase,
  report: (message: string) => void = () => {},
): Promise<void> => {
  assertDemoEnvironment();
  const organizationId = uuidFor("organization");
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  if (
    organization &&
    (organization.name !== DEMO_ORG_NAME ||
      organization.businessEmail !== DEMO_EMAIL ||
      organization.createdBy !== uuidFor("user:owner"))
  )
    throw new Error("Demo organization identity mismatch; reset refused.");
  const tenantRows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.organizationId, organizationId));
  const knownTenants = new Set(
    buildBrands(0, 0).map((brand) => uuidFor(`tenant:${brand.key}`)),
  );
  if (tenantRows.some((row) => !knownTenants.has(row.id)))
    throw new Error("Unrecognized tenant in demo organization; reset refused.");
  const audit = await db.execute(
    sql`SELECT EXISTS (SELECT 1 FROM audit_logs WHERE tenant_id IN (SELECT id FROM tenants WHERE organization_id = ${organizationId})) AS present`,
  );
  if (audit[0]?.["present"])
    throw new Error(
      "Demo audit history is append-only; reset refused. Use a fresh disposable demo database. No data was deleted.",
    );
  if (tenantRows.length) {
    const ids = tenantRows.map((row) => row.id);
    const orderIds = db
      .select({ id: orders.id })
      .from(orders)
      .where(inArray(orders.tenantId, ids));
    const paymentIds = db
      .select({ id: payments.id })
      .from(payments)
      .where(inArray(payments.orderId, orderIds));
    const billIds = db
      .select({ id: bills.id })
      .from(bills)
      .where(inArray(bills.orderId, orderIds));
    const itemIds = db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));
    // Bulk-delete leaves first; avoid repeated FK scans for large demo histories.
    report("Removing demo payments and bill allocations");
    await db
      .delete(paymentRefunds)
      .where(inArray(paymentRefunds.paymentId, paymentIds));
    await db.delete(payments).where(inArray(payments.orderId, orderIds));
    await db
      .delete(billOrderItems)
      .where(inArray(billOrderItems.billId, billIds));
    report("Removing demo stock deductions and order records");
    await db
      .delete(inventoryTransactions)
      .where(
        inArray(
          inventoryTransactions.inventoryItemId,
          db
            .select({ id: inventoryItems.id })
            .from(inventoryItems)
            .where(inArray(inventoryItems.tenantId, ids)),
        ),
      );
    await db
      .delete(orderInventoryDeductions)
      .where(inArray(orderInventoryDeductions.orderId, orderIds));
    await db
      .delete(orderItemModifiers)
      .where(inArray(orderItemModifiers.orderItemId, itemIds));
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await db
      .delete(kitchenTickets)
      .where(inArray(kitchenTickets.tenantId, ids));
    await db
      .delete(orderStatusHistory)
      .where(inArray(orderStatusHistory.orderId, orderIds));
    await db.delete(bills).where(inArray(bills.orderId, orderIds));
    await db
      .delete(promotionRedemptions)
      .where(inArray(promotionRedemptions.orderId, orderIds));
    // RESTRICT references from order lines to menu items require this ordering.
    await db.delete(orders).where(inArray(orders.tenantId, ids));
    await db.delete(combos).where(inArray(combos.tenantId, ids));
  }
  report("Removing generated demo tenants and accounts");
  if (tenantRows.length)
    await db.delete(tenants).where(
      inArray(
        tenants.id,
        tenantRows.map((row) => row.id),
      ),
    );
  if (organization)
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  // Fixed IDs AND exact emails: never delete accounts merely sharing a suffix/name.
  const accounts = [{ id: uuidFor("user:owner"), email: DEMO_EMAIL }];
  const roleNames = ["MANAGER", "CHEF", "WAITER", "CASHIER"];
  for (const brand of buildBrands(0, 0))
    for (let branch = 0; branch < 6; branch++)
      for (let staff = 0; staff < 10; staff++)
        accounts.push({
          id: uuidFor(`staff:${brand.key}:${branch}:${staff}`),
          email: `${brand.key}.${branch + 1}.${roleNames[staff % 4]!.toLowerCase()}.${staff + 1}@demo.servora.local`,
        });
  for (const account of accounts) {
    const [existing] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, account.id));
    if (existing && existing.email !== account.email)
      throw new Error("Demo user identity mismatch; reset refused.");
    if (existing) {
      const linked = await db.execute(
        sql`SELECT EXISTS(SELECT 1 FROM tenant_memberships WHERE user_id=${account.id}) OR EXISTS(SELECT 1 FROM organization_memberships WHERE user_id=${account.id}) AS present`,
      );
      if (linked[0]?.["present"])
        throw new Error(
          "Demo account has non-demo memberships; reset refused.",
        );
    }
    await db
      .delete(users)
      .where(and(eq(users.id, account.id), eq(users.email, account.email)));
  }
};
