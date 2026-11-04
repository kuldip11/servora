import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { createLogger } from "@/core/logger";

const logger = createLogger({}, "assistant");
const WINDOW_DAYS = 60;
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: Map<string, number> }>();

/**
 * Units ordered per menu item at this branch in the last 60 days. Only counts
 * real orders (not cancelled). Cached briefly: concierge traffic must not turn
 * into an aggregate query per message. Never throws: popularity is a ranking
 * hint, so any failure degrades to "no history".
 */
export async function getPopularity(
  tenantId: string,
  branchId: string,
): Promise<Map<string, number>> {
  const key = `${tenantId}:${branchId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
    const rows = await db
      .select({
        menuItemId: orderItems.menuItemId,
        units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(
          Number,
        ),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.branchId, branchId),
          gte(orders.createdAt, since),
          inArray(orders.status, ["OPEN", "BILL_REQUESTED", "PAID", "CLOSED"]),
          isNotNull(orderItems.menuItemId),
        ),
      )
      .groupBy(orderItems.menuItemId);
    const value = new Map<string, number>();
    for (const row of rows)
      if (row.menuItemId && row.units > 0) value.set(row.menuItemId, row.units);
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    logger.warn("assistant.popularity_failed", { tenantId, branchId });
    return new Map();
  }
}
