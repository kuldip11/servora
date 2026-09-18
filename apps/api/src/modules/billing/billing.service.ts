import type { PaymentMethod, RestaurantTable } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import { billingRepository } from "./billing.repository";
import { eventBus } from "@/lib/event-bus";
import { orderRepository } from "@/modules/orders/order.repository";
import {
  orderNotFound,
  paymentNotFound,
  billNotFound,
  paymentNotRefundable,
  refundExceedsPaymentAmount,
  paymentExceedsDueAmount,
  billSelectionRequired,
  splitBillNotAllowed,
  invalidBillAllocation,
} from "./billing.errors";
import {
  assertBillingResourceAccess,
  requireBillingPermission,
} from "./billing-authorization";
import {
  buildFractionalSeatAllocationPlan,
  buildSeatAllocationPlan,
} from "./billing-split";

export interface CreatePaymentInput {
  orderId: string;
  billId?: string | undefined;
  method: PaymentMethod;
  amount: number;
  reference?: string | undefined;
}

export interface CreateRefundInput {
  paymentId: string;
  amount: number;
  reason: string;
}

export const billingService = {
  async createPayment(auth: AuthContext, input: CreatePaymentInput) {
    requireBillingPermission(auth, "billing:create");
    const result = await billingRepository.recordPayment({
      ...input,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      changedBy: auth.userId,
    });
    if (result.status === "order_not_found") throw orderNotFound(input.orderId);
    if (result.status === "bill_not_found") throw billNotFound(input.billId!);
    if (result.status === "bill_required") throw billSelectionRequired();
    if (result.status === "payment_exceeds_due")
      throw paymentExceedsDueAmount();
    assertBillingResourceAccess(auth, result.orderBranchId);

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
          { type: "order.updated", payload: paidOrder as never },
          auth.tenantId,
          result.orderBranchId,
        );
      }
      for (const releasedTable of result.releasedTables ?? []) {
        await eventBus.publish(
          {
            type: "table.updated",
            payload: releasedTable as unknown as RestaurantTable,
          },
          auth.tenantId,
          result.orderBranchId,
        );
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

  async splitOrder(auth: AuthContext, orderId: string, ways: number) {
    requireBillingPermission(auth, "billing:create");
    const result = await billingRepository.splitOrderEvenly({
      orderId,
      ways,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
    });
    if (result.status === "order_not_found") throw orderNotFound(orderId);
    assertBillingResourceAccess(auth, result.orderBranchId);
    if (result.status === "already_paid")
      throw splitBillNotAllowed("BILL_ALREADY_PAID");
    if (result.status === "too_many_bills")
      throw splitBillNotAllowed("TOO_MANY_BILLS");
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "BILL_SPLIT",
      entity: "order",
      entityId: orderId,
      metadata: { ways, billIds: result.bills.map((bill) => bill.id) },
    });
    return result.bills;
  },
  async splitOrderByItems(
    auth: AuthContext,
    orderId: string,
    allocations: Array<{ label?: string; orderItemIds: string[] }>,
  ) {
    requireBillingPermission(auth, "billing:create");
    const result = await billingRepository.splitOrderByItems({
      orderId,
      allocations,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
    });
    if (result.status === "order_not_found") throw orderNotFound(orderId);
    assertBillingResourceAccess(auth, result.orderBranchId);
    if (result.status === "already_paid")
      throw splitBillNotAllowed("BILL_ALREADY_PAID");
    if (result.status === "invalid_allocation")
      throw invalidBillAllocation(result.reason);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "BILL_SPLIT",
      entity: "order",
      entityId: orderId,
      metadata: { mode: "ITEM", billIds: result.bills.map((bill) => bill.id) },
    });
    return result.bills;
  },
  async splitOrderBySeat(
    auth: AuthContext,
    orderId: string,
    sharedItemStrategy: "EVEN_SPLIT" | "MANUAL",
  ) {
    requireBillingPermission(auth, "billing:create");
    const source = await billingRepository.findActiveItemsForSeatSplit({
      orderId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
    });
    if (!source) throw orderNotFound(orderId);
    assertBillingResourceAccess(auth, source.orderBranchId);
    const fractionalPlan = buildFractionalSeatAllocationPlan(
      source.items,
      sharedItemStrategy,
    );
    if (fractionalPlan) {
      if (fractionalPlan.status === "no_seats")
        throw invalidBillAllocation("NO_SEAT_LABELS");
      if (fractionalPlan.status === "manual_required") {
        return {
          status: "MANUAL_REQUIRED" as const,
          allocations: fractionalPlan.allocations,
          sharedItemIds: fractionalPlan.sharedItemIds,
        };
      }
      const result = await billingRepository.splitOrderByShares({
        orderId,
        allocations: fractionalPlan.allocations,
        tenantId: auth.tenantId,
        branchId: auth.branchId,
      });
      if (result.status === "order_not_found") throw orderNotFound(orderId);
      if (result.status === "already_paid")
        throw splitBillNotAllowed("BILL_ALREADY_PAID");
      if (result.status === "invalid_allocation")
        throw invalidBillAllocation(result.reason);
      return { status: "CREATED" as const, bills: result.bills };
    }

    const plan = buildSeatAllocationPlan(source.items, sharedItemStrategy);
    if (plan.status === "no_seats")
      throw invalidBillAllocation("NO_SEAT_LABELS");
    if (plan.status === "manual_required") {
      return {
        status: "MANUAL_REQUIRED" as const,
        allocations: plan.allocations,
        sharedItemIds: plan.sharedItemIds,
      };
    }
    const bills = await this.splitOrderByItems(auth, orderId, plan.allocations);
    return { status: "CREATED" as const, bills };
  },

  async setItemSeatShares(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    shares: Array<{ seatLabel: string; shareRatio: number }>,
  ) {
    requireBillingPermission(auth, "billing:create");
    if (!shares.length) throw invalidBillAllocation("EMPTY_BILL");
    if (
      new Set(shares.map((share) => share.seatLabel.trim().toLowerCase()))
        .size !== shares.length
    )
      throw invalidBillAllocation("DUPLICATE_ITEM");
    if (
      shares.some(
        (share) =>
          !share.seatLabel.trim() ||
          !Number.isFinite(share.shareRatio) ||
          share.shareRatio <= 0 ||
          share.shareRatio > 1,
      )
    )
      throw invalidBillAllocation("INVALID_RATIO");
    const total = shares.reduce((sum, share) => sum + share.shareRatio, 0);
    if (Math.abs(total - 1) > 0.000001)
      throw invalidBillAllocation("INVALID_RATIO");
    const result = await billingRepository.replaceSeatShares({
      orderId,
      orderItemId,
      shares,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
    });
    if (result.status === "order_not_found") throw orderNotFound(orderId);
    assertBillingResourceAccess(auth, result.orderBranchId);
    if (result.status === "item_not_found")
      throw invalidBillAllocation("UNKNOWN_ITEM");
    if (result.status === "already_paid")
      throw splitBillNotAllowed("BILL_ALREADY_PAID");
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORDER_ITEM_SEAT_SHARES_UPDATED",
      entity: "order_item",
      entityId: orderItemId,
      metadata: { orderId, shares },
    });
    return shares;
  },

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

  async createRefund(auth: AuthContext, input: CreateRefundInput) {
    requireBillingPermission(auth, "billing:refund");
    const result = await billingRepository.recordRefund({
      ...input,
      processedBy: auth.userId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
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
