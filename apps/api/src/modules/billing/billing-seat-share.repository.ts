import {
  assertBillingResourceAccess,
  requireBillingWriteContext,
} from "./billing-authorization";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orderItemSeatShares, orders, payments } from "@/db/schema";

export const billingSeatShareRepository = {
  async replaceSeatShares(data: {
    orderId: string;
    orderItemId: string;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
    shares: Array<{ seatLabel: string; shareRatio: number }>;
  }) {
    requireBillingWriteContext(data);
    return db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, data.orderId),
          eq(orders.tenantId, data.tenantId),
        ),
      });
      if (!order || (data.branchId && order.branchId !== data.branchId))
        return { status: "order_not_found" as const };
      assertBillingResourceAccess(data, order.branchId);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${order.mergedIntoOrderId ?? order.id}))`,
      );
      const item = await tx.query.orderItems.findFirst({
        where: and(
          eq(orderItems.id, data.orderItemId),
          eq(orderItems.orderId, data.orderId),
          eq(orderItems.billingExcluded, false),
        ),
      });
      if (!item)
        return {
          status: "item_not_found" as const,
          orderBranchId: order.branchId,
        };
      const payment = await tx.query.payments.findFirst({
        where: eq(payments.orderId, data.orderId),
      });
      if (payment)
        return {
          status: "already_paid" as const,
          orderBranchId: order.branchId,
        };
      await tx
        .delete(orderItemSeatShares)
        .where(eq(orderItemSeatShares.orderItemId, data.orderItemId));
      if (data.shares.length) {
        await tx.insert(orderItemSeatShares).values(
          data.shares.map((share) => ({
            orderItemId: data.orderItemId,
            seatLabel: share.seatLabel.trim(),
            shareRatio: share.shareRatio.toFixed(6),
          })),
        );
      }
      return { status: "ok" as const, orderBranchId: order.branchId };
    });
  },
};
