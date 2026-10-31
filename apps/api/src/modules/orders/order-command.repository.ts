import { and, eq } from "drizzle-orm";
import type { OrderStatus } from "@pos/types";
import { db } from "@/db";
import { orderStatusHistory, orders } from "@/db/schema";
import { compact } from "@/lib/object-utils";

export const orderCommandRepository = {
  async mergeOrders(data: {
    tenantId: string;
    branchId: string;
    sourceOrderId: string;
    targetOrderId: string;
  }) {
    return db.transaction(async (tx) => {
      const source = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, data.sourceOrderId),
          eq(orders.tenantId, data.tenantId),
          eq(orders.branchId, data.branchId),
        ),
      });
      const target = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, data.targetOrderId),
          eq(orders.tenantId, data.tenantId),
          eq(orders.branchId, data.branchId),
        ),
      });
      if (!source || !target) return { status: "not_found" as const };
      if (source.id === target.id) return { status: "same_order" as const };
      if (
        !["OPEN", "BILL_REQUESTED"].includes(source.status) ||
        !["OPEN", "BILL_REQUESTED"].includes(target.status)
      )
        return { status: "closed" as const };
      const targetIsSource = await tx.query.orders.findFirst({
        where: eq(orders.mergedIntoOrderId, source.id),
      });
      if (
        source.mergedIntoOrderId ||
        target.mergedIntoOrderId ||
        targetIsSource
      )
        return { status: "already_merged" as const };
      const [updated] = await tx
        .update(orders)
        .set({ mergedIntoOrderId: target.id, updatedAt: new Date() })
        .where(
          and(eq(orders.id, source.id), eq(orders.tenantId, data.tenantId)),
        )
        .returning();
      return { status: "ok" as const, source: updated!, target };
    });
  },

  async updateStatus(
    tenantId: string,
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    reason?: string | undefined,
    cancellationReasonId?: string | undefined,
    branchId?: string | undefined,
  ) {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.tenantId, tenantId),
            branchId ? eq(orders.branchId, branchId) : undefined,
          ),
        );

      if (!current) return undefined;

      await tx.insert(orderStatusHistory).values(
        compact({
          orderId,
          oldStatus: current.status,
          newStatus,
          changedBy,
          reason,
          cancellationReasonId,
        }) as typeof orderStatusHistory.$inferInsert,
      );

      const [updated] = await tx
        .update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    });
  },
};
