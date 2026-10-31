import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import {
  assertBillingResourceAccess,
  requireBillingPermission,
  requireBillingWriteContext,
} from "./billing-authorization";
import {
  paymentNotFound,
  paymentNotRefundable,
  refundExceedsPaymentAmount,
} from "./billing.errors";
import { billingRepository } from "./billing.repository";
import type { CreateRefundInput } from "./billing.types";

export const billingRefundService = {
  async createRefund(auth: AuthContext, input: CreateRefundInput) {
    requireBillingPermission(auth, "billing:refund");
    requireBillingWriteContext(auth);
    const result = await billingRepository.recordRefund({
      ...input,
      processedBy: auth.userId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      tenantWide: auth.tenantWide,
    });
    if (result.status === "payment_not_found")
      throw paymentNotFound(input.paymentId);
    assertBillingResourceAccess(auth, result.orderBranchId);
    if (result.status === "not_refundable") throw paymentNotRefundable();
    if (result.status === "exceeds_amount") throw refundExceedsPaymentAmount();
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "REFUND_CREATED",
      entity: "payment_refund",
      entityId: result.refund.id,
      metadata: {
        paymentId: input.paymentId,
        amount: input.amount,
        reason: input.reason,
        branchId: result.orderBranchId,
      },
    });
    return result.refund;
  },
};
