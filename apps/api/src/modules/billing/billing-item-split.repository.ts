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
import {
  allocateTotalsByWeight,
  type ItemAllocation,
  validateComboGroupAllocations,
  validateItemAllocations,
} from "./billing-split-validation";

export const billingItemSplitRepository = {
  async splitOrderByItems(data: {
    orderId: string;
    allocations: ItemAllocation[];
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
      const existingPayment = await tx.query.payments.findFirst({
        where: eq(payments.orderId, data.orderId),
      });
      if (existingPayment)
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
      const validation = validateItemAllocations(
        activeItems.map((item) => item.id),
        data.allocations,
      );
      if (!validation.ok)
        return {
          status: "invalid_allocation" as const,
          reason: validation.reason,
          orderBranchId: order.branchId,
        };
      const comboValidation = validateComboGroupAllocations(
        activeItems,
        data.allocations,
      );
      if (!comboValidation.ok)
        return {
          status: "invalid_allocation" as const,
          reason: comboValidation.reason,
          orderBranchId: order.branchId,
        };
      const itemsById = new Map(activeItems.map((item) => [item.id, item]));
      const weights = data.allocations.map((allocation) =>
        allocation.orderItemIds.reduce((sum, id) => {
          const item = itemsById.get(id)!;
          return (
            sum +
            Number(item.subtotal) *
              (item.taxMode === "INCLUSIVE"
                ? 1
                : 1 + Number(item.taxRate) / 100)
          );
        }, 0),
      );
      const totals = allocateTotalsByWeight(Number(order.totalAmount), weights);
      const subtotals = data.allocations.map((allocation) =>
        allocation.orderItemIds.reduce(
          (sum, id) => sum + Number(itemsById.get(id)!.subtotal),
          0,
        ),
      );
      const taxes = allocateTotalsByWeight(Number(order.taxAmount), weights);
      const discounts = allocateTotalsByWeight(
        Number(order.discountAmount),
        weights,
      );
      const serviceCharges = allocateTotalsByWeight(
        Number(order.serviceChargeAmount),
        weights,
      );
      const roundingAdjustments = allocateTotalsByWeight(
        Number(order.roundingAdjustment),
        weights,
      );
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
      const created = await tx
        .insert(bills)
        .values(
          data.allocations.map((allocation, index) => ({
            orderId: data.orderId,
            splitLabel: allocation.label?.trim() || `Bill ${index + 1}`,
            subtotal: subtotals[index]!.toFixed(2),
            taxAmount: taxes[index]!.toFixed(2),
            discountAmount: discounts[index]!.toFixed(2),
            serviceChargeAmount: serviceCharges[index]!.toFixed(2),
            roundingAdjustment: roundingAdjustments[index]!.toFixed(2),
            totalAmount: totals[index]!.toFixed(2),
          })),
        )
        .returning();
      await tx.insert(billOrderItems).values(
        data.allocations.flatMap((allocation, index) =>
          allocation.orderItemIds.map((orderItemId) => ({
            billId: created[index]!.id,
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
