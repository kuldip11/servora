import { inArray, sql } from "drizzle-orm";
import {
  inventoryItems,
  inventoryTransactions,
  orderInventoryDeductions,
} from "@/db/schema";
import type { DemoConfig, SeedContext, SeedDatabase } from "./types";
import { qty, uuidFor } from "./utils";

/** Reconciles historical recipe usage with actual stock and its chronological ledger. */
export const seedConsumption = async (
  db: SeedDatabase,
  _config: DemoConfig,
  ctx: SeedContext,
) => {
  const tenantIds = Object.values(ctx.tenantIds);
  const usage =
    await db.execute(sql`SELECT i.id AS inventory_id, i.unit, o.id AS order_id, k.id AS ticket_id, l.menu_item_id,
   min(l.id::text)::uuid AS line_id, min(k.fired_at) AS deducted_at,
   sum(r.quantity_required * l.quantity) AS quantity
 FROM order_items l JOIN orders o ON o.id=l.order_id JOIN kitchen_tickets k ON k.id=l.kitchen_ticket_id
 JOIN recipes r ON r.menu_item_id=l.menu_item_id AND r.variant_id IS NULL AND r.modifier_option_id IS NULL
 JOIN inventory_items i ON i.id=r.inventory_item_id AND i.branch_id=o.branch_id
 WHERE o.tenant_id IN (${sql.join(
   tenantIds.map((id) => sql`${id}::uuid`),
   sql`,`,
 )})
 AND o.status <> 'CANCELLED' AND l.item_status='ACTIVE' AND k.fired_at IS NOT NULL
 GROUP BY i.id, i.unit, o.id, k.id, l.menu_item_id`);
  const deductions: Array<typeof orderInventoryDeductions.$inferInsert> = [];
  const consumption = new Map<string, number>();
  const entries = new Map<
    string,
    Array<typeof inventoryTransactions.$inferInsert>
  >();
  for (const row of usage) {
    const inventoryId = String(row["inventory_id"]);
    const amount = Number(row["quantity"]);
    const key = `${row["ticket_id"]}:${row["menu_item_id"]}:${inventoryId}`;
    const when = new Date(String(row["deducted_at"]));
    deductions.push({
      id: uuidFor(`deduction:${key}`),
      orderId: String(row["order_id"]),
      kitchenTicketId: String(row["ticket_id"]),
      orderItemId: String(row["line_id"]),
      menuItemId: String(row["menu_item_id"]),
      inventoryItemId: inventoryId,
      quantityDeducted: qty(amount),
      unit: row["unit"] as "KG",
      deductedAt: when,
    });
    consumption.set(inventoryId, (consumption.get(inventoryId) ?? 0) + amount);
    const rows = entries.get(inventoryId) ?? [];
    rows.push({
      id: uuidFor(`consumption:${key}`),
      inventoryItemId: inventoryId,
      transactionType: "OUT",
      quantity: qty(amount),
      balanceBefore: "0",
      balanceAfter: "0",
      notes: "Demo recipe consumption",
      performedBy: ctx.ownerUserId,
      createdAt: when,
    });
    entries.set(inventoryId, rows);
  }
  for (let i = 0; i < deductions.length; i += 250)
    await db
      .insert(orderInventoryDeductions)
      .values(deductions.slice(i, i + 250));
  const items = await db
    .select()
    .from(inventoryItems)
    .where(inArray(inventoryItems.tenantId, tenantIds));
  const prior = await db
    .select()
    .from(inventoryTransactions)
    .where(
      inArray(
        inventoryTransactions.inventoryItemId,
        items.map((item) => item.id),
      ),
    );
  const priorByItem = new Map<string, typeof prior>();
  for (const entry of prior) {
    const rows = priorByItem.get(entry.inventoryItemId) ?? [];
    rows.push(entry);
    priorByItem.set(entry.inventoryItemId, rows);
  }
  const ledger: Array<typeof inventoryTransactions.$inferInsert> = [];
  const balances: Array<{ id: string; stock: string }> = [];
  for (const item of items) {
    const rows = [
      ...(priorByItem.get(item.id) ?? []),
      ...(entries.get(item.id) ?? []),
    ].sort(
      (a, b) =>
        a.createdAt!.getTime() - b.createdAt!.getTime() ||
        a.id!.localeCompare(b.id!),
    );
    const opening = rows.find((row) => row.transactionType === "IN");
    if (!opening) throw new Error("Missing demo opening stock");
    opening.quantity = qty(
      Number(opening.quantity) + (consumption.get(item.id) ?? 0),
    );
    let balance = 0;
    for (const row of rows) {
      const delta =
        Number(row.quantity) *
        (row.transactionType === "OUT" || row.transactionType === "WASTE"
          ? -1
          : 1);
      row.balanceBefore = qty(balance);
      balance = Math.round((balance + delta) * 1000) / 1000;
      row.balanceAfter = qty(balance);
      if (balance < -0.001)
        throw new Error("Demo stock ledger became negative");
      ledger.push(row);
    }
    balances.push({ id: item.id, stock: qty(balance) });
  }
  for (let i = 0; i < ledger.length; i += 250)
    await db
      .insert(inventoryTransactions)
      .values(ledger.slice(i, i + 250))
      .onConflictDoUpdate({
        target: inventoryTransactions.id,
        set: {
          quantity: sql`excluded.quantity`,
          balanceBefore: sql`excluded.balance_before`,
          balanceAfter: sql`excluded.balance_after`,
        },
      });
  if (balances.length)
    await db.execute(
      sql`UPDATE inventory_items i SET current_stock=v.stock FROM (VALUES ${sql.join(
        balances.map((row) => sql`(${row.id}::uuid,${row.stock}::numeric)`),
        sql`,`,
      )}) AS v(id,stock) WHERE i.id=v.id`,
    );
};
