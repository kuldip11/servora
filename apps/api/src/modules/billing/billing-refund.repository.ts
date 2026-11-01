import {
  assertBillingResourceAccess,
  requireBillingWriteContext,
} from "./billing-authorization";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentRefunds, payments } from "@/db/schema";
import { resolveRefundEligibility } from "./billing-refund";

export type RecordRefundResult =
  | { status: "payment_not_found" }
  | { status: "not_refundable"; orderBranchId: string }
  | { status: "exceeds_amount"; orderBranchId: string }
  | {
      status: "ok";
      orderBranchId: string;
      refund: typeof paymentRefunds.$inferSelect;
    };

export const billingRefundRepository = {
  async recordRefund(data: {
    paymentId: string;
    amount: number;
    reason: string;
    processedBy: string;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
  }): Promise<RecordRefundResult> {
    requireBillingWriteContext(data);
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select({ payment: payments, orderBranchId: orders.branchId })
        .from(payments)
        .innerJoin(orders, eq(orders.id, payments.orderId))
        .where(
          data.branchId
            ? and(
                eq(payments.id, data.paymentId),
                eq(orders.tenantId, data.tenantId),
                eq(orders.branchId, data.branchId),
              )
            : and(
                eq(payments.id, data.paymentId),
                eq(orders.tenantId, data.tenantId),
              ),
        );
      if (!row) return { status: "payment_not_found" };
      assertBillingResourceAccess(data, row.orderBranchId);

      const resolution = resolveRefundEligibility(
        row.payment.status,
        parseFloat(row.payment.amount),
        data.amount,
      );
      if (!resolution.ok) {
        return {
          status:
            resolution.reason === "PAYMENT_NOT_REFUNDABLE"
              ? "not_refundable"
              : "exceeds_amount",
          orderBranchId: row.orderBranchId,
        };
      }

      const [updatedPayment] = await tx
        .update(payments)
        .set({ status: "REFUNDED" })
        .where(
          and(
            eq(payments.id, data.paymentId),
            eq(payments.orderId, row.payment.orderId),
            eq(payments.status, "SUCCESS"),
          ),
        )
        .returning();
      if (!updatedPayment)
        return { status: "not_refundable", orderBranchId: row.orderBranchId };

      const [refund] = await tx
        .insert(paymentRefunds)
        .values({
          paymentId: data.paymentId,
          amount: data.amount.toFixed(2),
          reason: data.reason,
          processedBy: data.processedBy,
        })
        .returning();
      return {
        status: "ok",
        orderBranchId: row.orderBranchId,
        refund: refund!,
      };
    });
  },
};
