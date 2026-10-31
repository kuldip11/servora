import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import { eventBus } from "@/lib/event-bus";
import { orderRepository } from "@/modules/orders/order.repository";
import { toRealtimeOrderPayload } from "@/modules/realtime/realtime.mapper";
import { toTableResponse } from "@/modules/tables/table.mapper";
import {
  assertBillingResourceAccess,
  requireBillingPermission,
  requireBillingWriteContext,
} from "./billing-authorization";
import {
  billNotFound,
  billSelectionRequired,
  orderNotFound,
  paymentExceedsDueAmount,
  paymentIdempotencyConflict,
} from "./billing.errors";
import { billingRepository } from "./billing.repository";
import type { CreatePaymentInput } from "./billing.types";

export const billingPaymentService = {
  async createPayment(auth: AuthContext, input: CreatePaymentInput) {
    requireBillingPermission(auth, "billing:create");
    requireBillingWriteContext(auth);
    const result = await billingRepository.recordPayment({
      ...input,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      tenantWide: auth.tenantWide,
      changedBy: auth.userId,
    });
    if (result.status === "order_not_found") throw orderNotFound(input.orderId);
    if (result.status === "bill_not_found") throw billNotFound(input.billId!);
    if (result.status === "idempotency_conflict")
      throw paymentIdempotencyConflict();
    if (result.status === "bill_required") throw billSelectionRequired();
    if (result.status === "payment_exceeds_due")
      throw paymentExceedsDueAmount();
    assertBillingResourceAccess(auth, result.orderBranchId);

    if (!result.replayed) {
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action: "PAYMENT_CREATED",
        entity: "payment",
        entityId: result.payment.id,
        metadata: {
          orderId: input.orderId,
          amount: input.amount,
          method: input.method,
          status: result.payment.status,
          branchId: result.orderBranchId,
        },
      });

      await eventBus.publish(
        {
          type: "payment.updated",
          payload: {
            paymentId: result.payment.id,
            orderId: input.orderId,
            status: result.payment.status,
            amount: parseFloat(result.payment.amount),
          },
        },
        auth.tenantId,
        result.orderBranchId,
      );

      if (result.orderPaid && result.order.status === "PAID") {
        const paidOrder = await orderRepository.findById(
          auth.tenantId,
          input.orderId,
        );
        if (paidOrder) {
          await eventBus.publish(
            {
              type: "order.updated",
              payload: toRealtimeOrderPayload(paidOrder),
            },
            auth.tenantId,
            result.orderBranchId,
          );
        }
        for (const releasedTable of result.releasedTables ?? []) {
          await eventBus.publish(
            {
              type: "table.updated",
              payload: toTableResponse(releasedTable),
            },
            auth.tenantId,
            result.orderBranchId,
          );
        }
      }
    }

    return {
      bill: result.bill,
      payment: result.payment,
      paymentState: result.orderPaid
        ? ("PAID" as const)
        : ("PARTIALLY_PAID" as const),
    };
  },
};
