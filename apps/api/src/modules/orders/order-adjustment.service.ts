import type { AuthContext } from "@/core/auth";
import {
  requireOrdersPermission,
  assertOrderResourceAccess,
} from "./orders-authorization";
import { ValidationError } from "@/core/errors";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { eventBus } from "@/lib/event-bus";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import { orderRepository } from "./order.repository";
import { type PricedLine } from "./pricing/pricing-pipeline";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import { cancellationReasonService } from "./cancellation-reasons/cancellation-reason.service";
import {
  finalizeWholeActiveOrder,
  type StoredOrderLineForRepricing,
} from "./active-order-pricing";
import { isBillableOrderItem } from "./order-item-billing";
import { approvalService } from "@/modules/approvals/approval.service";
import { approvalAdjustmentValue } from "@/modules/approvals/approval-policy";
import {
  orderNotFound,
  orderItemNotFound,
  orderItemCannotBeVoided,
  orderItemCannotBeComped,
} from "./order.errors";

export const orderAdjustmentService = {
  async voidItem(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    reason?: string | undefined,
    cancellationReasonId?: string | undefined,
    approvalToken?: string | undefined,
  ) {
    requireOrdersPermission(auth, "orders:void");
    if (!reason?.trim() && !cancellationReasonId) {
      throw new ValidationError("A void reason is required");
    }
    await cancellationReasonService.assertUsable(
      auth.tenantId,
      cancellationReasonId,
    );
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);
    if (order.status !== "OPEN") {
      throw orderItemCannotBeVoided(
        "Items can only be voided on an open order",
      );
    }
    const item = order.items.find((candidate) => candidate.id === orderItemId);
    if (!item) throw orderItemNotFound(orderItemId);
    if (item.itemStatus !== "ACTIVE") {
      throw orderItemCannotBeVoided(
        "This item has already been voided or comped",
      );
    }
    const adjustmentValue = approvalAdjustmentValue(order.items, orderItemId);
    await approvalService.assertApproved(
      auth.tenantId,
      "VOID",
      orderId,
      orderItemId,
      adjustmentValue,
      approvalToken,
    );
    const ticket = order.kitchenTickets?.find((candidate) =>
      candidate.items?.some((ticketItem) => ticketItem.id === orderItemId),
    );
    if (ticket?.status === "SERVED") {
      throw orderItemCannotBeVoided("A served item cannot be voided");
    }

    const remaining = order.items.filter((candidate) => {
      const sameAdjustmentTarget = item.comboGroupId
        ? candidate.comboGroupId === item.comboGroupId
        : candidate.id === orderItemId;
      return !sameAdjustmentTarget && isBillableOrderItem(candidate);
    });
    const existingRedemptions =
      await promotionRepository.listRedemptionsForOrder(orderId);
    const pricingContext = {
      tenantId: auth.tenantId,
      branchId: order.branchId,
      channel: "STAFF" as const,
      fulfillmentType: order.type,
      asOf: new Date(),
      ...(order.customerId ? { customerId: order.customerId } : {}),
      ...(order.customerGroupId
        ? { customerGroupId: order.customerGroupId }
        : {}),
    };
    const repriced =
      order.billingMode === "PER_COVER"
        ? {
            subtotal: Number(order.subtotal),
            discountAmount: Number(order.discountAmount),
            taxAmount: Number(order.taxAmount),
            serviceChargeAmount: Number(order.serviceChargeAmount),
            roundingAdjustment: Number(order.roundingAdjustment),
            totalAmount: Number(order.totalAmount),
            existingPricingUpdates: [] as Array<{
              id: string;
              pricingAttribution: PricedLine["pricingAttribution"];
              taxMode: "INCLUSIVE" | "EXCLUSIVE";
            }>,
            redemptions: existingRedemptions,
          }
        : await finalizeWholeActiveOrder(
            pricingContext,
            remaining as StoredOrderLineForRepricing[],
            [],
            {
              ...(existingRedemptions.length
                ? {
                    promotionIds: existingRedemptions.map(
                      (entry) => entry.promotionId,
                    ),
                  }
                : {}),
              ...(order.customerId ? { customerId: order.customerId } : {}),
            },
          );
    const totals = {
      subtotal: repriced.subtotal,
      discountAmount: repriced.discountAmount,
      taxAmount: repriced.taxAmount,
      serviceChargeAmount: repriced.serviceChargeAmount,
      roundingAdjustment: repriced.roundingAdjustment,
      totalAmount: repriced.totalAmount,
      existingPricingUpdates: repriced.existingPricingUpdates,
      promotionRedemptions: repriced.redemptions,
    };
    const updated = await orderRepository.voidItem(
      auth.tenantId,
      orderId,
      orderItemId,
      auth.userId,
      reason?.trim() ?? "",
      cancellationReasonId,
      totals,
    );
    if (!updated) {
      throw orderItemCannotBeVoided(
        "This item has already been voided or comped",
      );
    }
    if (updated.reversedInventoryItemIds.length) {
      await inventoryService.syncMenuItemAvailability(
        auth.tenantId,
        order.branchId,
        updated.reversedInventoryItemIds,
      );
    }

    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    await eventBus.publish(
      { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
      auth.tenantId,
      order.branchId,
    );
    const updatedTicket = fullOrder?.kitchenTickets?.find(
      (candidate) => candidate.id === ticket?.id,
    );
    if (updatedTicket) {
      await eventBus.publish(
        {
          type: "order.item.voided",
          payload: toRealtimeKitchenTicketPayload(updatedTicket),
        },
        auth.tenantId,
        order.branchId,
      );
    }
    return fullOrder;
  },

  async compItem(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    reason?: string | undefined,
    cancellationReasonId?: string | undefined,
    approvalToken?: string | undefined,
  ) {
    requireOrdersPermission(auth, "orders:comp");
    if (!reason?.trim() && !cancellationReasonId) {
      throw new ValidationError("A comp reason is required");
    }
    await cancellationReasonService.assertUsable(
      auth.tenantId,
      cancellationReasonId,
    );
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);
    if (order.status !== "OPEN") {
      throw orderItemCannotBeComped(
        "Items can only be comped on an open order",
      );
    }
    const item = order.items.find((candidate) => candidate.id === orderItemId);
    if (!item) throw orderItemNotFound(orderItemId);
    if (item.itemStatus !== "ACTIVE") {
      throw orderItemCannotBeComped(
        "This item has already been voided or comped",
      );
    }
    const adjustmentValue = approvalAdjustmentValue(order.items, orderItemId);
    await approvalService.assertApproved(
      auth.tenantId,
      "COMP",
      orderId,
      orderItemId,
      adjustmentValue,
      approvalToken,
    );

    const remaining = order.items.filter((candidate) => {
      const sameAdjustmentTarget = item.comboGroupId
        ? candidate.comboGroupId === item.comboGroupId
        : candidate.id === orderItemId;
      return !sameAdjustmentTarget && isBillableOrderItem(candidate);
    });
    const existingRedemptions =
      await promotionRepository.listRedemptionsForOrder(orderId);
    const pricingContext = {
      tenantId: auth.tenantId,
      branchId: order.branchId,
      channel: "STAFF" as const,
      fulfillmentType: order.type,
      asOf: new Date(),
      ...(order.customerId ? { customerId: order.customerId } : {}),
      ...(order.customerGroupId
        ? { customerGroupId: order.customerGroupId }
        : {}),
    };
    const repriced =
      order.billingMode === "PER_COVER"
        ? {
            subtotal: Number(order.subtotal),
            discountAmount: Number(order.discountAmount),
            taxAmount: Number(order.taxAmount),
            serviceChargeAmount: Number(order.serviceChargeAmount),
            roundingAdjustment: Number(order.roundingAdjustment),
            totalAmount: Number(order.totalAmount),
            existingPricingUpdates: [] as Array<{
              id: string;
              pricingAttribution: PricedLine["pricingAttribution"];
              taxMode: "INCLUSIVE" | "EXCLUSIVE";
            }>,
            redemptions: existingRedemptions,
          }
        : await finalizeWholeActiveOrder(
            pricingContext,
            remaining as StoredOrderLineForRepricing[],
            [],
            {
              ...(existingRedemptions.length
                ? {
                    promotionIds: existingRedemptions.map(
                      (entry) => entry.promotionId,
                    ),
                  }
                : {}),
              ...(order.customerId ? { customerId: order.customerId } : {}),
            },
          );
    const totals = {
      subtotal: repriced.subtotal,
      discountAmount: repriced.discountAmount,
      taxAmount: repriced.taxAmount,
      serviceChargeAmount: repriced.serviceChargeAmount,
      roundingAdjustment: repriced.roundingAdjustment,
      totalAmount: repriced.totalAmount,
      existingPricingUpdates: repriced.existingPricingUpdates,
      promotionRedemptions: repriced.redemptions,
    };
    const updated = await orderRepository.compItem(
      auth.tenantId,
      orderId,
      orderItemId,
      auth.userId,
      reason?.trim() ?? "",
      cancellationReasonId,
      totals,
    );
    if (!updated) {
      throw orderItemCannotBeComped(
        "This item has already been voided or comped",
      );
    }

    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    await eventBus.publish(
      { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
      auth.tenantId,
      order.branchId,
    );
    return fullOrder;
  },
};
