import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import {
  assertBillingResourceAccess,
  requireBillingPermission,
  requireBillingWriteContext,
} from "./billing-authorization";
import {
  invalidBillAllocation,
  orderNotFound,
  splitBillNotAllowed,
} from "./billing.errors";
import { billingRepository } from "./billing.repository";
import {
  buildFractionalSeatAllocationPlan,
  buildSeatAllocationPlan,
} from "./billing-split";

export const billingSplitService = {
  async splitOrder(auth: AuthContext, orderId: string, ways: number) {
    requireBillingPermission(auth, "billing:create");
    requireBillingWriteContext(auth);
    const result = await billingRepository.splitOrderEvenly({
      orderId,
      ways,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      tenantWide: auth.tenantWide,
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
    requireBillingWriteContext(auth);
    const result = await billingRepository.splitOrderByItems({
      orderId,
      allocations,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      tenantWide: auth.tenantWide,
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
    requireBillingWriteContext(auth);
    const source = await billingRepository.findActiveItemsForSeatSplit({
      orderId,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      tenantWide: auth.tenantWide,
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
        tenantWide: auth.tenantWide,
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
    const bills = await billingSplitService.splitOrderByItems(
      auth,
      orderId,
      plan.allocations,
    );
    return { status: "CREATED" as const, bills };
  },
  async setItemSeatShares(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    shares: Array<{ seatLabel: string; shareRatio: number }>,
  ) {
    requireBillingPermission(auth, "billing:create");
    requireBillingWriteContext(auth);
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
      tenantWide: auth.tenantWide,
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
};
