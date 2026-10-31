import {
  assertBillingResourceAccess,
  requireBillingWriteContext,
} from "./billing-authorization";
import { and, eq, sql, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  billOrderItems,
  bills,
  orderItems,
  orders,
  payments,
} from "@/db/schema";
import { groupOrderItemsForEvenBills } from "./billing-split-validation";
import { splitMoneyEvenly } from "./billing-split-money";

export const billingEvenSplitRepository = {
  async splitOrderEvenly(data: {
    orderId: string;
    ways: number;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
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
      const existingPayments = await tx.query.payments.findFirst({
        where: eq(payments.orderId, data.orderId),
      });
      if (existingPayments)
        return {
          status: "already_paid" as const,
          orderBranchId: order.branchId,
        };
      const activeItems = await tx.query.orderItems.findMany({
        where: and(
          eq(orderItems.orderId, data.orderId),
          eq(orderItems.billingExcluded, false),
          or(
            eq(orderItems.itemStatus, "ACTIVE"),
            and(
              eq(orderItems.itemStatus, "REFIRED"),
              isNull(orderItems.compedAt),
            ),
          ),
        ),
      });
      const itemIdsByBill = groupOrderItemsForEvenBills(activeItems, data.ways);
      if (!itemIdsByBill)
        return {
          status: "too_many_bills" as const,
          orderBranchId: order.branchId,
        };
      const oldBills = await tx.query.bills.findMany({
        where: eq(bills.orderId, data.orderId),
      });
      if (oldBills.length) {
        await tx.delete(billOrderItems).where(
          inArray(
            billOrderItems.billId,
            oldBills.map((bill) => bill.id),
          ),
        );
        await tx.delete(bills).where(
          inArray(
            bills.id,
            oldBills.map((bill) => bill.id),
          ),
        );
      }
      const totals = splitMoneyEvenly(parseFloat(order.totalAmount), data.ways);
      const subtotals = splitMoneyEvenly(parseFloat(order.subtotal), data.ways);
      const taxes = splitMoneyEvenly(parseFloat(order.taxAmount), data.ways);
      const discounts = splitMoneyEvenly(
        parseFloat(order.discountAmount),
        data.ways,
      );
      const serviceCharges = splitMoneyEvenly(
        parseFloat(order.serviceChargeAmount),
        data.ways,
      );
      const roundingAdjustments = splitMoneyEvenly(
        parseFloat(order.roundingAdjustment),
        data.ways,
      );
      const created = await tx
        .insert(bills)
        .values(
          totals.map((total, index) => ({
            orderId: data.orderId,
            splitLabel: `Bill ${index + 1}`,
            subtotal: subtotals[index]!.toFixed(2),
            taxAmount: taxes[index]!.toFixed(2),
            discountAmount: discounts[index]!.toFixed(2),
            serviceChargeAmount: serviceCharges[index]!.toFixed(2),
            roundingAdjustment: roundingAdjustments[index]!.toFixed(2),
            totalAmount: total.toFixed(2),
          })),
        )
        .returning();
      await tx.insert(billOrderItems).values(
        itemIdsByBill.flatMap((itemIds, billIndex) =>
          itemIds.map((orderItemId) => ({
            billId: created[billIndex]!.id,
            orderItemId,
          })),
        ),
      );
      return {
        status: "ok" as const,
        orderBranchId: order.branchId,
        bills: created,
      };
    });
  },
};
