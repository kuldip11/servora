import {
  eq,
  and,
  or,
  isNull,
  gte,
  lte,
  count,
  sum,
  notInArray,
  desc,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { orders, inventoryItems, orderItems, menuItems } from "@/db/schema";

import { ACTIVE_ORDER_EXCLUDED_STATUSES } from "./constants";

export const analyticsRepository = {
  async countPaidOrdersSince(
    tenantId: string,
    branchId: string | null,
    since: Date,
  ) {
    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          gte(orders.createdAt, since),
          eq(orders.status, "PAID"),
        ),
      );
    return result?.count ?? 0;
  },

  async countCancelledOrdersSince(
    tenantId: string,
    branchId: string | null,
    since: Date,
  ) {
    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          gte(orders.createdAt, since),
          eq(orders.status, "CANCELLED"),
        ),
      );
    return result?.count ?? 0;
  },

  async countOrdersSince(
    tenantId: string,
    branchId: string | null,
    since: Date,
  ) {
    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          gte(orders.createdAt, since),
        ),
      );
    return result?.count ?? 0;
  },

  async sumPaidRevenueSince(
    tenantId: string,
    branchId: string | null,
    since: Date,
  ) {
    const [result] = await db
      .select({ total: sum(orders.totalAmount) })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          gte(orders.createdAt, since),
          eq(orders.status, "PAID"),
        ),
      );
    return parseFloat(result?.total ?? "0");
  },

  async countActiveOrders(tenantId: string, branchId: string | null) {
    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          notInArray(orders.status, [...ACTIVE_ORDER_EXCLUDED_STATUSES]),
        ),
      );
    return result?.count ?? 0;
  },

  async findTopItems(tenantId: string, branchId: string | null, since: Date) {
    const rows = await db
      .select({
        name: orderItems.menuItemName,
        count: sum(orderItems.quantity),
        revenue: sum(orderItems.subtotal),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          gte(orders.createdAt, since),
          notInArray(orders.status, ["CANCELLED"]),
        ),
      )
      .groupBy(orderItems.menuItemName)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(5);

    return rows.map((row) => ({
      name: row.name,
      count: Number(row.count ?? 0),
      revenue: parseFloat(row.revenue ?? "0"),
    }));
  },

  async revenueByHour(tenantId: string, branchId: string | null, since: Date) {
    const rows = await db
      .select({
        hour: sql<number>`extract(hour from ${orders.createdAt})`,
        revenue: sum(orders.totalAmount),
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          branchId ? eq(orders.branchId, branchId) : undefined,
          gte(orders.createdAt, since),
          eq(orders.status, "PAID"),
        ),
      )
      .groupBy(sql`extract(hour from ${orders.createdAt})`)
      .orderBy(sql`extract(hour from ${orders.createdAt})`);

    return rows.map((row) => ({
      hour: Number(row.hour),
      revenue: parseFloat(row.revenue ?? "0"),
    }));
  },

  async findCostReportItems(
    tenantId: string,
    branchId: string,
    categoryId?: string,
  ) {
    return db.query.menuItems.findMany({
      where: and(
        eq(menuItems.tenantId, tenantId),
        isNull(menuItems.deletedAt),
        eq(menuItems.isPublished, true),
        or(
          isNull(menuItems.effectiveFrom),
          lte(menuItems.effectiveFrom, new Date()),
        ),
        or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId)),
        categoryId ? eq(menuItems.categoryId, categoryId) : undefined,
      ),
      columns: {
        id: true,
        name: true,
        categoryId: true,
        branchId: true,
        manualCost: true,
      },
      with: {
        category: { columns: { id: true, name: true } },
        variants: { columns: { id: true, name: true } },
      },
      orderBy: menuItems.name,
    });
  },

  async salesVolumeByItem(tenantId: string, branchId: string, since: Date) {
    const rows = await db
      .select({
        menuItemId: orderItems.menuItemId,
        variantId: orderItems.variantId,
        volume: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.branchId, branchId),
          gte(orders.createdAt, since),
          notInArray(orders.status, ["CANCELLED"]),
          sql`${orderItems.itemStatus} NOT IN ('VOIDED', 'COMPED')`,
        ),
      )
      .groupBy(orderItems.menuItemId, orderItems.variantId);
    return rows.map((row) => ({ ...row, volume: Number(row.volume) }));
  },

  async findActiveInventoryItems(tenantId: string, branchId: string | null) {
    return db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.tenantId, tenantId),
        branchId ? eq(inventoryItems.branchId, branchId) : undefined,
        eq(inventoryItems.isActive, true),
      ),
    });
  },
};
