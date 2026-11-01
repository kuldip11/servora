import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
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
import {
  storedOrderLineToStage4Snapshot,
  type StoredOrderLineForRepricing,
} from "./active-order-pricing";
import type { PricedLine } from "./pricing/pricing-pipeline";

const logger = createLogger({}, "order-kitchen");
export const orderRefillService = {
  async refillItem(auth: AuthContext, orderId: string, orderItemId: string) {
    requireOrdersPermission(auth, "orders:update");
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);
    if (order.status !== "OPEN")
      throw orderItemCannotBeRefired(
        "Refills are only available on an open order",
      );
    const original = order.items.find((item) => item.id === orderItemId);
    if (!original || original.menuItemId === null)
      throw orderItemNotFound(orderItemId);
    if (
      original.itemStatus !== "ACTIVE" ||
      !original.comboSlotOption?.isUnlimitedRefill
    ) {
      throw orderItemCannotBeRefired(
        "This combo component is not eligible for unlimited refill",
      );
    }
    const originalTicket = order.kitchenTickets?.find((ticket) =>
      ticket.items?.some((item) => item.id === orderItemId),
    );
    if (
      !originalTicket ||
      ["HELD", "PENDING_PAYMENT"].includes(originalTicket.status)
    ) {
      throw orderItemCannotBeRefired(
        "A refill is available only after the original component was fired",
      );
    }
    const asOf = new Date();
    const source = storedOrderLineToStage4Snapshot(
      original as StoredOrderLineForRepricing,
    );
    const zeroLine: PricedLine = {
      ...source,
      unitPrice: 0,
      subtotal: 0,
      billingExcluded: true,
      comboSlotOptionId: original.comboSlotOptionId ?? undefined,
      modifiers: source.modifiers.map((modifier) => ({
        ...modifier,
        price: 0,
      })),
      pricingAttribution: {
        ...source.pricingAttribution,
        BASE_PRICE: 0,
        VARIANT: 0,
        MODIFIER: 0,
        COMBO: 0,
      },
    };
    const [replacementLine] = await snapshotOrderLines(
      auth.tenantId,
      [zeroLine],
      {
        branchId: order.branchId,
        channel: order.source,
        fulfillmentType: order.type,
        asOf,
      },
    );
    if (!replacementLine)
      throw orderItemCannotBeRefired("The refill could not be snapshotted");
    const result = await orderRepository.refireItem({
      tenantId: auth.tenantId,
      branchId: order.branchId,
      orderId,
      originalItemId: orderItemId,
      item: replacementLine,
      changedBy: auth.userId,
      reason: "Unlimited refill",
      compOriginal: false,
      claimOriginal: false,
      refireType: "REFILL",
      forceBillingExcluded: true,
      absoluteTotals: {
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        discountAmount: Number(order.discountAmount),
        serviceChargeAmount: Number(order.serviceChargeAmount),
        roundingAdjustment: Number(order.roundingAdjustment),
        totalAmount: Number(order.totalAmount),
      },
    });
    if (!result)
      throw orderItemCannotBeRefired(
        "This component can no longer be refilled",
      );
    const detailedTicket = await ticketRepository.findDetailedById(
      auth.tenantId,
      result.ticket.id,
    );
    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    if (fullOrder)
      await eventBus.publish(
        { type: "order.updated", payload: toRealtimeOrderPayload(fullOrder) },
        auth.tenantId,
        order.branchId,
      );
    if (detailedTicket) {
      await eventBus.publish(
        {
          type: "kitchen.ticket.created",
          payload: toRealtimeKitchenTicketPayload(detailedTicket),
        },
        auth.tenantId,
        order.branchId,
      );
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
        logger.error("order.refill_inventory_deduction_failed", toError(err), {
          orderId,
          orderItemId: result.replacement.id,
          branchId: order.branchId,
        });
      }
    }
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: order.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORDER_ITEM_REFILL",
      entity: "order_item",
      entityId: result.replacement.id,
      metadata: {
        orderId,
        originalItemId: orderItemId,
        comboGroupId: original.comboGroupId,
      },
    });
    return fullOrder;
  },
};
