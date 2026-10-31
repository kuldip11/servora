import type { AuthContext } from "@/core/auth";
import {
  assertBillingResourceAccess,
  requireBillingPermission,
} from "./billing-authorization";
import { billNotFound, orderNotFound } from "./billing.errors";
import { billingRepository } from "./billing.repository";

export const billingQueryService = {
  async getOrderBills(auth: AuthContext, orderId: string) {
    requireBillingPermission(auth, "billing:read");
    const result = await billingRepository.findBillsByOrder({
      orderId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
    });
    if (!result) throw orderNotFound(orderId);
    assertBillingResourceAccess(auth, result.orderBranchId);
    return result.bills;
  },
  async getBill(auth: AuthContext, billId: string) {
    requireBillingPermission(auth, "billing:read");
    const result = await billingRepository.findBillById({
      billId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
    });
    if (!result) throw billNotFound(billId);
    assertBillingResourceAccess(auth, result.orderBranchId);
    return result.bill;
  },
};
