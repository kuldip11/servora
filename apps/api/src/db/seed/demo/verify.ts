import { count, eq, sql } from "drizzle-orm";
import type { SeedDatabase, DemoConfig, SeedContext } from "./types";
import {
  branches,
  customers,
  kitchenTickets,
  menuItems,
  orders,
  payments,
  restaurantTables,
  tenants,
} from "@/db/schema";

export const verifyDemoSeed = async (
  db: SeedDatabase,
  config: DemoConfig,
  ctx: SeedContext,
  report: (message: string) => void = () => {},
): Promise<void> => {
  const [tenantCount] = await db
    .select({ value: count() })
    .from(tenants)
    .where(eq(tenants.organizationId, ctx.organizationId));
  if (!tenantCount || tenantCount.value !== config.brands.length)
    throw new Error(
      `Demo verification failed: expected configured franchises, found ${tenantCount?.value ?? 0}`,
    );
  for (const tenantId of Object.values(ctx.tenantIds)) {
    const [branchCount, itemCount, customerCount, orderCount] =
      await Promise.all([
        db
          .select({ value: count() })
          .from(branches)
          .where(eq(branches.tenantId, tenantId)),
        db
          .select({ value: count() })
          .from(menuItems)
          .where(eq(menuItems.tenantId, tenantId)),
        db
          .select({ value: count() })
          .from(customers)
          .where(eq(customers.tenantId, tenantId)),
        db
          .select({ value: count() })
          .from(orders)
          .where(eq(orders.tenantId, tenantId)),
      ]);
    if (
      (branchCount[0]?.value ?? 0) === 0 ||
      (itemCount[0]?.value ?? 0) === 0 ||
      (customerCount[0]?.value ?? 0) === 0 ||
      (orderCount[0]?.value ?? 0) === 0
    ) {
      throw new Error(`Demo verification failed for tenant ${tenantId}`);
    }

    const [
      orderStates,
      orderTypes,
      ticketStates,
      itemStates,
      tableStates,
      paymentMethods,
      paymentStates,
    ] = await Promise.all([
      db
        .selectDistinct({ value: orders.status })
        .from(orders)
        .where(eq(orders.tenantId, tenantId)),
      db
        .selectDistinct({ value: orders.type })
        .from(orders)
        .where(eq(orders.tenantId, tenantId)),
      db
        .selectDistinct({ value: kitchenTickets.status })
        .from(kitchenTickets)
        .where(eq(kitchenTickets.tenantId, tenantId)),
      db
        .selectDistinct({ value: menuItems.status })
        .from(menuItems)
        .where(eq(menuItems.tenantId, tenantId)),
      db
        .selectDistinct({ value: restaurantTables.status })
        .from(restaurantTables)
        .where(eq(restaurantTables.tenantId, tenantId)),
      db
        .selectDistinct({ value: payments.method })
        .from(payments)
        .innerJoin(orders, eq(payments.orderId, orders.id))
        .where(eq(orders.tenantId, tenantId)),
      db
        .selectDistinct({ value: payments.status })
        .from(payments)
        .innerJoin(orders, eq(payments.orderId, orders.id))
        .where(eq(orders.tenantId, tenantId)),
    ]);
    assertCoverage("order statuses", orderStates, [
      "OPEN",
      "BILL_REQUESTED",
      "PAID",
      "CLOSED",
      "CANCELLED",
    ]);
    assertCoverage("order types", orderTypes, [
      "DINE_IN",
      "TAKEAWAY",
      "DELIVERY",
      "ONLINE",
    ]);
    assertCoverage("kitchen ticket statuses", ticketStates, [
      "PENDING_PAYMENT",
      "HELD",
      "FIRED",
      "PREPARING",
      "READY",
      "SERVED",
    ]);
    assertCoverage("menu item statuses", itemStates, [
      "ACTIVE",
      "OUT_OF_STOCK",
      "HIDDEN",
      "SEASONAL",
      "DISCONTINUED",
    ]);
    assertCoverage("table statuses", tableStates, [
      "AVAILABLE",
      "OCCUPIED",
      "CLEANING",
      "RESERVED",
    ]);
    assertCoverage("payment methods", paymentMethods, [
      "CASH",
      "CARD",
      "UPI",
      "RAZORPAY",
      "STRIPE",
    ]);
    assertCoverage("payment statuses", paymentStates, [
      "PENDING",
      "SUCCESS",
      "FAILED",
      "REFUNDED",
    ]);
  }
  const scope = sql`(${sql.join(
    Object.values(ctx.tenantIds).map((id) => sql`${id}::uuid`),
    sql`,`,
  )})`;
  const checks: Array<[string, ReturnType<typeof sql>]> = [
    [
      "order totals",
      sql`SELECT o.id FROM orders o WHERE o.tenant_id IN ${scope} AND abs(o.total_amount-(o.subtotal-o.discount_amount+o.tax_amount+o.service_charge_amount+o.rounding_adjustment)) > 0.001`,
    ],
    [
      "order line totals",
      sql`SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.tenant_id IN ${scope} GROUP BY o.id HAVING abs(o.subtotal-sum(i.subtotal)) > 0.001`,
    ],
    [
      "bill totals",
      sql`SELECT b.id FROM bills b JOIN orders o ON o.id=b.order_id WHERE o.tenant_id IN ${scope} AND (b.total_amount<>o.total_amount OR b.subtotal<>o.subtotal OR b.tax_amount<>o.tax_amount OR b.discount_amount<>o.discount_amount OR b.service_charge_amount<>o.service_charge_amount)`,
    ],
    [
      "settled payments",
      sql`SELECT o.id FROM orders o LEFT JOIN payments p ON p.order_id=o.id AND p.status IN ('SUCCESS','REFUNDED') WHERE o.tenant_id IN ${scope} AND o.status IN ('PAID','CLOSED') GROUP BY o.id HAVING abs(o.total_amount-coalesce(sum(p.amount),0))>0.001`,
    ],
    [
      "refund totals",
      sql`SELECT p.id FROM payments p JOIN orders o ON o.id=p.order_id LEFT JOIN payment_refunds r ON r.payment_id=p.id WHERE o.tenant_id IN ${scope} AND p.status='REFUNDED' GROUP BY p.id HAVING abs(p.amount-coalesce(sum(r.amount),0))>0.001`,
    ],
    [
      "stock balances",
      sql`SELECT id FROM (SELECT i.id,i.current_stock,t.balance_after,row_number() OVER(PARTITION BY i.id ORDER BY t.created_at DESC,t.id DESC) AS position FROM inventory_items i JOIN inventory_transactions t ON t.inventory_item_id=i.id WHERE i.tenant_id IN ${scope}) x WHERE position=1 AND current_stock<>balance_after`,
    ],
    [
      "stock ledger continuity",
      sql`SELECT id FROM (SELECT t.id,t.balance_before,lag(t.balance_after,1,0::numeric) OVER(PARTITION BY t.inventory_item_id ORDER BY t.created_at,t.id) AS previous,t.balance_after,t.quantity,t.transaction_type FROM inventory_transactions t JOIN inventory_items i ON i.id=t.inventory_item_id WHERE i.tenant_id IN ${scope}) x WHERE balance_before<>previous OR balance_after<>(balance_before+CASE WHEN transaction_type IN ('OUT','WASTE') THEN -quantity ELSE quantity END)`,
    ],
    [
      "branch isolation",
      sql`SELECT l.id FROM order_items l JOIN orders o ON o.id=l.order_id JOIN kitchen_stations s ON s.id=l.station_id WHERE o.tenant_id IN ${scope} AND (s.branch_id<>o.branch_id OR s.tenant_id<>o.tenant_id)`,
    ],
    [
      "live table state",
      sql`SELECT o.id FROM orders o JOIN restaurant_tables t ON t.id=o.table_id WHERE o.tenant_id IN ${scope} AND o.status IN ('OPEN','BILL_REQUESTED') AND (t.status<>'OCCUPIED' OR NOT t.is_active)`,
    ],
    [
      "ticket chronology",
      sql`SELECT k.id FROM kitchen_tickets k WHERE k.tenant_id IN ${scope} AND (k.ready_at<k.fired_at OR k.served_at<k.ready_at OR k.ready_at>${config.referenceTime.toISOString()}::timestamp OR k.served_at>${config.referenceTime.toISOString()}::timestamp)`,
    ],
    [
      "missing recipes",
      sql`SELECT i.id FROM menu_items i WHERE i.tenant_id IN ${scope} AND i.enable_recipe_deduction AND NOT EXISTS (SELECT 1 FROM recipes r WHERE r.menu_item_id=i.id)`,
    ],
    [
      "deduction ledger totals",
      sql`SELECT d.inventory_item_id,sum(d.quantity_deducted) FROM order_inventory_deductions d JOIN orders o ON o.id=d.order_id WHERE o.tenant_id IN ${scope} GROUP BY d.inventory_item_id EXCEPT SELECT t.inventory_item_id,sum(t.quantity) FROM inventory_transactions t JOIN inventory_items i ON i.id=t.inventory_item_id WHERE i.tenant_id IN ${scope} AND t.notes='Demo recipe consumption' AND t.transaction_type='OUT' GROUP BY t.inventory_item_id`,
    ],
  ];
  for (const [name, query] of checks) {
    report(`Checking ${name}`);
    const result = await db.execute(query);
    if (result.length)
      throw new Error(
        `Demo verification failed: ${name} (${result.length} records)`,
      );
  }
};

const assertCoverage = (
  label: string,
  rows: { value: string }[],
  expected: readonly string[],
): void => {
  const actual = new Set(rows.map((row) => row.value));
  const missing = expected.filter((value) => !actual.has(value));
  if (missing.length > 0)
    throw new Error(
      `Demo verification failed: missing ${label}: ${missing.join(", ")}`,
    );
};
