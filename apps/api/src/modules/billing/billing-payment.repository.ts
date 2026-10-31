import { createHash } from "node:crypto";
import {
  assertBillingResourceAccess,
  requireBillingWriteContext,
} from "./billing-authorization";
import { and, eq, inArray, isNull, or, sum, sql } from "drizzle-orm";
import type { PaymentMethod } from "@pos/types";
import { db } from "@/db";
import {
  billOrderItems,
  bills,
  orderItems,
  orders,
  orderStatusHistory,
  payments,
  paymentCollectionRequests,
  restaurantTables,
} from "@/db/schema";
import { areAllBillsPaid, combinedOrderAmounts } from "./billing-split";

export type RecordPaymentResult =
  | { status: "order_not_found" }
  | { status: "bill_not_found" }
  | { status: "bill_required" }
  | { status: "idempotency_conflict" }
  | { status: "payment_exceeds_due"; dueAmount: number }
  | {
      status: "ok";
      replayed?: boolean;
      orderBranchId: string;
      bill: typeof bills.$inferSelect;
      payment: typeof payments.$inferSelect;
      order: typeof orders.$inferSelect;
      orderPaid: boolean;
      releasedTables?: Array<typeof restaurantTables.$inferSelect>;
    };

export const billingPaymentRepository = {
  async recordPayment(data: {
    orderId: string;
    idempotencyKey?: string | undefined;
    billId?: string | undefined;
    method: PaymentMethod;
    amount: number;
    reference?: string | undefined;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
    changedBy: string;
  }): Promise<RecordPaymentResult> {
    requireBillingWriteContext(data);
    return db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, data.orderId),
          eq(orders.tenantId, data.tenantId),
        ),
      });
      if (!order || (data.branchId && order.branchId !== data.branchId))
        return { status: "order_not_found" };
      assertBillingResourceAccess(data, order.branchId);
      let billingOrder = order.mergedIntoOrderId
        ? await tx.query.orders.findFirst({
            where: and(
              eq(orders.id, order.mergedIntoOrderId),
              eq(orders.tenantId, data.tenantId),
            ),
          })
        : order;
      if (!billingOrder) return { status: "order_not_found" };
      assertBillingResourceAccess(data, billingOrder.branchId);
      const billingOrderId = billingOrder.id;
      // Match checkout and gateway reconciliation. Read balances and create
      // bills only after locking the canonical billing order.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${billingOrderId}))`,
      );
      billingOrder = await tx.query.orders.findFirst({
        where: and(
          eq(orders.id, billingOrderId),
          eq(orders.tenantId, data.tenantId),
        ),
      });
      if (!billingOrder) return { status: "order_not_found" };
      assertBillingResourceAccess(data, billingOrder.branchId);
      const requestFingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            billId: data.billId ?? null,
            amount: data.amount.toFixed(2),
            method: data.method,
            reference: data.reference ?? null,
          }),
        )
        .digest("hex");
      const previousRequest = data.idempotencyKey
        ? await tx.query.paymentCollectionRequests.findFirst({
            where: and(
              eq(paymentCollectionRequests.orderId, billingOrderId),
              eq(paymentCollectionRequests.requestKey, data.idempotencyKey),
            ),
          })
        : undefined;
      if (
        previousRequest &&
        previousRequest.requestFingerprint !== requestFingerprint
      ) {
        return { status: "idempotency_conflict" };
      }
      const previousPayment = previousRequest
        ? await tx.query.payments.findFirst({
            where: eq(payments.id, previousRequest.paymentId),
          })
        : undefined;
      if (previousRequest && !previousPayment)
        return { status: "idempotency_conflict" };
      const mergedOrders = await tx.query.orders.findMany({
        where: and(
          eq(orders.mergedIntoOrderId, billingOrderId),
          eq(orders.tenantId, data.tenantId),
          eq(orders.branchId, billingOrder.branchId),
        ),
      });
      const combinedOrders = [billingOrder, ...mergedOrders];
      const combinedOrderIds = combinedOrders.map((candidate) => candidate.id);

      const orderBills = await tx.query.bills.findMany({
        where: eq(bills.orderId, billingOrderId),
      });
      let bill = previousPayment
        ? orderBills.find(
            (candidate) => candidate.id === previousPayment.billId,
          )
        : data.billId
          ? orderBills.find((candidate) => candidate.id === data.billId)
          : orderBills.length === 1
            ? orderBills[0]
            : undefined;
      if (data.billId && !bill) return { status: "bill_not_found" };
      if (!data.billId && orderBills.length > 1)
        return { status: "bill_required" };
      if (!bill) {
        const combined = combinedOrderAmounts(combinedOrders);
        const [newBill] = await tx
          .insert(bills)
          .values({
            orderId: billingOrderId,
            ...combined,
          })
          .returning();
        bill = newBill!;
        const activeItems = await tx.query.orderItems.findMany({
          where: and(
            inArray(orderItems.orderId, combinedOrderIds),
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
        if (activeItems.length) {
          await tx.insert(billOrderItems).values(
            activeItems.map((item) => ({
              billId: bill!.id,
              orderItemId: item.id,
            })),
          );
        }
      }

      const existingSuccessfulPayments = await tx
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(eq(payments.billId, bill.id), eq(payments.status, "SUCCESS")),
        );
      const alreadyPaid = parseFloat(
        existingSuccessfulPayments[0]?.total ?? "0",
      );
      const dueCents = Math.max(
        0,
        Math.round(parseFloat(bill.totalAmount) * 100) -
          Math.round(alreadyPaid * 100),
      );
      const dueAmount = dueCents / 100;
      if (!previousPayment && Math.round(data.amount * 100) > dueCents) {
        return { status: "payment_exceeds_due", dueAmount };
      }

      const payment =
        previousPayment ??
        (
          await tx
            .insert(payments)
            .values({
              orderId: billingOrderId,
              billId: bill.id,
              method: data.method,
              amount: data.amount.toFixed(2),
              reference: data.reference ?? null,
              status: "SUCCESS",
            })
            .returning()
        )[0]!;

      if (data.idempotencyKey && !previousPayment) {
        await tx.insert(paymentCollectionRequests).values({
          orderId: billingOrderId,
          requestKey: data.idempotencyKey,
          requestFingerprint,
          paymentId: payment.id,
        });
      }

      const allBills = orderBills.length ? orderBills : [bill];
      const paymentTotals = await tx
        .select({ billId: payments.billId, total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            eq(payments.orderId, billingOrderId),
            eq(payments.status, "SUCCESS"),
          ),
        )
        .groupBy(payments.billId);
      const totals = new Map<string, number>(
        paymentTotals
          .filter(
            (row): row is typeof row & { billId: string } =>
              row.billId !== null,
          )
          .map((row) => [row.billId, parseFloat(row.total ?? "0")]),
      );
      const orderPaid = areAllBillsPaid(allBills, totals);

      let updatedOrder = billingOrder;
      const releasedTables: Array<typeof restaurantTables.$inferSelect> = [];
      if (
        !previousPayment &&
        orderPaid &&
        billingOrder.status === "BILL_REQUESTED"
      ) {
        const paidOrders = await tx
          .update(orders)
          .set({ status: "PAID", updatedAt: new Date() })
          .where(
            and(
              inArray(orders.id, combinedOrderIds),
              eq(orders.tenantId, data.tenantId),
              eq(orders.branchId, billingOrder.branchId),
            ),
          )
          .returning();
        const paid = paidOrders.find(
          (candidate) => candidate.id === billingOrderId,
        );
        if (paid) {
          updatedOrder = paid;
          await tx.insert(orderStatusHistory).values(
            combinedOrders
              .filter((candidate) => candidate.status === "BILL_REQUESTED")
              .map((candidate) => ({
                orderId: candidate.id,
                oldStatus: "BILL_REQUESTED" as const,
                newStatus: "PAID" as const,
                changedBy: data.changedBy,
                reason: "Combined payment completed",
              })),
          );
          for (const paidOrder of paidOrders)
            if (paidOrder.tableId) {
              const [table] = await tx
                .update(restaurantTables)
                .set({ status: "AVAILABLE", updatedAt: new Date() })
                .where(
                  and(
                    eq(restaurantTables.id, paidOrder.tableId),
                    eq(restaurantTables.tenantId, data.tenantId),
                    eq(restaurantTables.branchId, paidOrder.branchId),
                  ),
                )
                .returning();
              if (table) releasedTables.push(table);
            }
        }
      }

      return {
        status: "ok",
        orderBranchId: billingOrder.branchId,
        bill,
        payment,
        ...(previousPayment ? { replayed: true } : {}),
        order: updatedOrder,
        orderPaid,
        ...(releasedTables.length ? { releasedTables } : {}),
      };
    });
  },
};
