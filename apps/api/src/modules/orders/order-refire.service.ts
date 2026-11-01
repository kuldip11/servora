import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import { ValidationError } from "@/core/errors";
import { createLogger, toError } from "@/core/logger/logger";
import { eventBus } from "@/lib/event-bus";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";
import {
  toRealtimeKitchenTicketPayload,
  toRealtimeOrderPayload,
} from "@/modules/realtime/realtime.mapper";
import {
  orderItemCannotBeRefired,
  orderItemNotFound,
  orderNotFound,
} from "./order.errors";
import { snapshotOrderLines } from "./order-line-snapshot.service";
import { orderRepository } from "./order.repository";
import {
  assertOrderResourceAccess,
  requireOrdersPermission,
} from "./orders-authorization";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import {
  finalizeWholeActiveOrder,
  storedOrderLineToStage4Snapshot,
  type StoredOrderLineForRepricing,
} from "./active-order-pricing";
import { isBillableOrderItem } from "./order-item-billing";

const logger = createLogger({}, "order-kitchen");
export const orderRefireService = {
  async refireItem(
    auth: AuthContext,
    orderId: string,
    orderItemId: string,
    reason: string,
    alsoCompOriginal = true,
  ) {
    requireOrdersPermission(auth, "orders:update");
    if (alsoCompOriginal) requireOrdersPermission(auth, "orders:comp");
    if (!reason.trim())
      throw new ValidationError("A refire reason is required");
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);
    if (order.status !== "OPEN")
      throw orderItemCannotBeRefired(
        "Items can only be refired on an open order",
      );
    const original = order.items.find((item) => item.id === orderItemId);
    if (!original || original.menuItemId === null)
      throw orderItemNotFound(orderItemId);
    if (original.itemStatus !== "ACTIVE")
      throw orderItemCannotBeRefired("Only an active item can be refired");
    const originalTicket = order.kitchenTickets?.find((ticket) =>
      ticket.items?.some((item) => item.id === orderItemId),
    );
    if (
      !originalTicket ||
      ["HELD", "PENDING_PAYMENT"].includes(originalTicket.status)
    ) {
      throw orderItemCannotBeRefired(
        "An item can only be refired after it has actually been sent to the kitchen",
      );
    }

    const asOf = new Date();
    const pricingContext = {
      tenantId: auth.tenantId,
      branchId: order.branchId,
      channel: "STAFF" as const,
      fulfillmentType: order.type,
      asOf,
      ...(order.customerId ? { customerId: order.customerId } : {}),
      ...(order.customerGroupId
        ? { customerGroupId: order.customerGroupId }
        : {}),
    };

    const storedSource = storedOrderLineToStage4Snapshot(
      original as StoredOrderLineForRepricing,
    );
    const [sourceLine] = await snapshotOrderLines(
      auth.tenantId,
      [storedSource],
      pricingContext,
    );
    if (!sourceLine)
      throw orderItemCannotBeRefired(
        "The item can no longer be snapshotted for refire",
      );
    const existingRedemptions =
      await promotionRepository.listRedemptionsForOrder(orderId);
    const existing = order.items.filter(
      (item) =>
        isBillableOrderItem(item) &&
        (!alsoCompOriginal || item.id !== orderItemId),
    );
    const repriced =
      order.billingMode === "PER_COVER"
        ? {
            subtotal: Number(order.subtotal),
            taxAmount: Number(order.taxAmount),
            discountAmount: Number(order.discountAmount),
            serviceChargeAmount: Number(order.serviceChargeAmount),
            roundingAdjustment: Number(order.roundingAdjustment),
            totalAmount: Number(order.totalAmount),
            existingPricingUpdates: [],
            redemptions: existingRedemptions,
            newLines: [{ ...sourceLine, billingExcluded: true }],
          }
        : await finalizeWholeActiveOrder(
            pricingContext,
            existing as StoredOrderLineForRepricing[],
            [sourceLine],
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
    const [replacementLine] = await snapshotOrderLines(
      auth.tenantId,
      repriced.newLines,
      pricingContext,
    );
    if (!replacementLine)
      throw orderItemCannotBeRefired(
        "The replacement item could not be snapshotted",
      );

    const result = await orderRepository.refireItem({
      tenantId: auth.tenantId,
      branchId: order.branchId,
      orderId,
      originalItemId: orderItemId,
      item: replacementLine,
      changedBy: auth.userId,
      reason: reason.trim(),
      compOriginal: alsoCompOriginal,
      refireType: "REFIRE",
      absoluteTotals: {
        subtotal: repriced.subtotal,
        taxAmount: repriced.taxAmount,
        discountAmount: repriced.discountAmount,
        serviceChargeAmount: repriced.serviceChargeAmount,
        roundingAdjustment: repriced.roundingAdjustment,
        totalAmount: repriced.totalAmount,
      },
      existingPricingUpdates: repriced.existingPricingUpdates,
      promotionRedemptions: repriced.redemptions,
    });
    if (!result)
      throw orderItemCannotBeRefired("This item can no longer be refired");
    const [detailedTicket, refreshedOriginalTicket] = await Promise.all([
      ticketRepository.findDetailedById(auth.tenantId, result.ticket.id),
      ticketRepository.findDetailedById(auth.tenantId, originalTicket.id),
    ]);
    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    if (fullOrder)
      await eventBus.publish(
        { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
        auth.tenantId,
        order.branchId,
      );
    if (refreshedOriginalTicket) {
      await eventBus.publish(
        {
          type: "kitchen.ticket.updated",
          payload: toRealtimeKitchenTicketPayload(refreshedOriginalTicket),
        },
        auth.tenantId,
        order.branchId,
      );
    }
    if (detailedTicket)
      await eventBus.publish(
        {
          type: "kitchen.ticket.created",
          payload: toRealtimeKitchenTicketPayload(detailedTicket),
        },
        auth.tenantId,
        order.branchId,
      );
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: order.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORDER_ITEM_REFIRED",
      entity: "order_item",
      entityId: result.replacement.id,
      metadata: {
        orderId,
        originalItemId: orderItemId,
        reason: reason.trim(),
        compedOriginal: alsoCompOriginal,
      },
    });
    if (detailedTicket) {
      try {
        await inventoryService.deductForOrderItemsWithRetry(
          auth.tenantId,
          order.branchId,
          orderId,
          detailedTicket.id,
          detailedTicket.items.flatMap((item) =>
            item.menuItemId === null
              ? []
              : [
                  {
                    orderItemId: item.id,
                    menuItemId: item.menuItemId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    weightQuantity: item.weightQuantity,
                    weightUnit: item.weightUnit,
                    selectedOptions: item.modifiers.flatMap((modifier) =>
                      modifier.modifierId == null
                        ? []
                        : [
                            {
                              optionId: modifier.modifierId,
                              quantity: modifier.quantity,
                            },
                          ],
                    ),
                  },
                ],
          ),
          auth.userId,
        );
      } catch (err) {
        logger.error("order.refire_inventory_deduction_failed", toError(err), {
          orderId,
          orderItemId: result.replacement.id,
          branchId: order.branchId,
        });
      }
    }
    return fullOrder;
  },
};
