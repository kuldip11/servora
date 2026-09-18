import { createLogger, toError } from "@/core/logger/logger";
import type { KitchenTicket, Order, RestaurantTable } from "@pos/types";
import { ValidationError } from "@/core/errors";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { eventBus } from "@/lib/event-bus";
import { orderRepository } from "@/modules/orders/order.repository";
import {
  pricingPipeline,
  type OrderItemInput,
  type PricedLine,
} from "@/modules/orders/pricing/pricing-pipeline";
import { customerRepository } from "./customer.repository";
import { customerSessionService } from "./customer-session.service";
import { customerPaymentService } from "./customer-payment.service";
import { tableRepository } from "@/modules/tables/table.repository";
import { menuResolver } from "@/modules/menu/menus/menu-resolver.service";
import { availabilityService } from "@/modules/menu/availability/availability.service";
import {
  priceComboOrders,
  type ComboOrderSelection,
} from "@/modules/menu/combos/combo-order.service";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import { loyaltyRepository } from "@/modules/loyalty/loyalty.repository";
import { snapshotOrderLines } from "@/modules/orders/order-line-snapshot.service";
import {
  finalizeWholeActiveOrder,
  type ExistingLinePricingUpdate,
  type StoredOrderLineForRepricing,
} from "@/modules/orders/active-order-pricing";
import { isBillableOrderItem } from "@/modules/orders/order-item-billing";
import { resolveCustomerRoundFulfillment } from "./customer-order.helpers";

const logger = createLogger({}, "customer-order");

export type CreateCustomerOrderInput = {
  fulfillmentType?: "DINE_IN" | "TAKEAWAY";
  items?: OrderItemInput[];
  combos?: ComboOrderSelection[];
  notes?: string;
  couponCode?: string;
  loyaltyPhone?: string;
};

export const customerOrderService = {
  async createOrder(
    token: string,
    input: CreateCustomerOrderInput,
    customerRequestId?: string,
  ) {
    const session = await customerSessionService.getSession(token);
    const roundFulfillmentType = resolveCustomerRoundFulfillment(
      session.mode,
      input.fulfillmentType,
    );
    const normalizedItems = (input.items ?? []).map((item) => ({
      ...item,
      fulfillmentType: roundFulfillmentType,
    }));
    if (normalizedItems.length === 0 && !input.combos?.length) {
      throw new ValidationError("Order requires at least one item or combo");
    }

    const existingSummary = await customerRepository.findOpenOrderBySession(
      session.tenantId,
      session.branchId,
      session.id,
    );
    const existing = existingSummary
      ? await orderRepository.findById(session.tenantId, existingSummary.id)
      : null;
    let associatedCustomerId = existing?.customerId ?? null;
    if (input.loyaltyPhone?.trim()) {
      const loyaltyMatches = await loyaltyRepository.findCustomersByPhone(
        session.tenantId,
        input.loyaltyPhone.trim(),
      );
      if (loyaltyMatches.length === 0) {
        throw new ValidationError(
          "No loyalty customer matches that phone number",
        );
      }
      if (loyaltyMatches.length > 1) {
        throw new ValidationError(
          "That loyalty phone number is ambiguous; ask staff to update the customer record",
        );
      }
      const loyaltyCustomer = loyaltyMatches[0]!;
      if (associatedCustomerId && associatedCustomerId !== loyaltyCustomer.id) {
        throw new ValidationError(
          "This open order is already linked to a different loyalty customer",
        );
      }
      associatedCustomerId = loyaltyCustomer.id;
    }

    const asOf = new Date();
    const tablePricingContext = {
      tenantId: session.tenantId,
      branchId: session.branchId,
      channel: "CUSTOMER_QR" as const,
      fulfillmentType: session.mode,
      asOf,
      ...(associatedCustomerId ? { customerId: associatedCustomerId } : {}),
    };
    const roundPricingContext = {
      ...tablePricingContext,
      fulfillmentType: roundFulfillmentType,
    };

    const regular = await pricingPipeline.price(
      roundPricingContext,
      normalizedItems,
    );
    const combo = await priceComboOrders(
      roundPricingContext,
      input.combos ?? [],
    );
    const unresolvedLines = [...regular.lines, ...combo.lines];
    const realLines = unresolvedLines.flatMap((line) =>
      line.menuItemId === null
        ? []
        : [{ menuItemId: line.menuItemId, quantity: line.quantity }],
    );

    const activeCustomerItemIds = await menuResolver.getActiveItemIds(
      session.tenantId,
      session.branchId,
      "CUSTOMER_QR",
      roundFulfillmentType,
      asOf,
    );
    for (const line of realLines) {
      if (!activeCustomerItemIds.has(line.menuItemId)) {
        throw new ValidationError(
          "This item is not on an active menu for your order",
        );
      }
      const effective = await availabilityService.getEffectiveItem(
        session.tenantId,
        line.menuItemId,
        session.branchId,
        {
          channel: "CUSTOMER_QR",
          fulfillmentType: roundFulfillmentType,
          asOf,
        },
      );
      if (effective.effectiveStatus !== "ACTIVE" || effective.isHidden) {
        throw new ValidationError("This item is not available right now");
      }
    }

    const stockCheck = await inventoryService.validateStock(
      session.tenantId,
      session.branchId,
      realLines,
    );
    if (!stockCheck.valid) {
      throw new ValidationError(
        `Some requested items are out of stock: ${stockCheck.insufficient.map((item) => item.name).join(", ")}`,
      );
    }

    const priorRedemptions = existing
      ? await promotionRepository.listRedemptionsForOrder(existing.id)
      : [];
    const continuedPromotionIds = priorRedemptions.map(
      (entry) => entry.promotionId,
    );

    let promoted: Awaited<ReturnType<typeof pricingPipeline.finalize>>;
    let existingPricingUpdates: ExistingLinePricingUpdate[] = [];
    let newFinalLines: PricedLine[];
    if (existing) {
      const whole = await finalizeWholeActiveOrder(
        tablePricingContext,
        existing.items.filter((item) =>
          isBillableOrderItem(item),
        ) as StoredOrderLineForRepricing[],
        unresolvedLines,
        {
          ...(input.couponCode ? { couponCode: input.couponCode } : {}),
          ...(continuedPromotionIds.length
            ? { promotionIds: continuedPromotionIds }
            : {}),
          ...(associatedCustomerId ? { customerId: associatedCustomerId } : {}),
        },
      );
      promoted = whole;
      existingPricingUpdates = whole.existingPricingUpdates;
      newFinalLines = whole.newLines;
    } else {
      promoted = await pricingPipeline.finalize(
        roundPricingContext,
        unresolvedLines,
        {
          ...(input.couponCode ? { couponCode: input.couponCode } : {}),
          ...(associatedCustomerId ? { customerId: associatedCustomerId } : {}),
        },
      );
      newFinalLines = promoted.lines;
    }
    const resolved = await snapshotOrderLines(session.tenantId, newFinalLines, {
      branchId: session.branchId,
      channel: "CUSTOMER_QR",
      fulfillmentType: roundFulfillmentType,
      asOf,
    });
    const subtotal = promoted.subtotal;
    const discountAmount = promoted.discountAmount;
    const taxAmount = promoted.taxAmount;

    let orderId: string;
    let createdNewOrder = false;
    let roundCreated = false;
    if (existing) {
      if (existing.status === "BILL_REQUESTED") {
        throw new ValidationError(
          "This order is already being settled. Payment must be completed before ordering more.",
        );
      }
      if (session.mode === "TAKEAWAY")
        throw new ValidationError(
          "This takeaway order has already been submitted",
        );
      let duplicateSubmission = false;
      if (customerRequestId) {
        duplicateSubmission =
          !!(await customerRepository.findCustomerRequestTicket(
            existing.id,
            customerRequestId,
          ));
      }
      if (!duplicateSubmission) {
        try {
          await orderRepository.fireNewTicket(
            session.tenantId,
            session.branchId,
            existing.id,
            resolved,
            subtotal,
            taxAmount,
            input.notes,
            customerRequestId,
            {
              existingPricingUpdates,
              absoluteTotals: {
                subtotal: promoted.subtotal,
                taxAmount: promoted.taxAmount,
                discountAmount: promoted.discountAmount,
                serviceChargeAmount: promoted.serviceChargeAmount,
                roundingAdjustment: promoted.roundingAdjustment,
                totalAmount: promoted.totalAmount,
              },
              promotionRedemptions: promoted.redemptions,
              replacePromotionRedemptions: true,
              ...(associatedCustomerId
                ? { customerId: associatedCustomerId }
                : {}),
            },
          );
          roundCreated = true;
        } catch (error) {
          if ((error as { code?: string })?.code !== "23505") throw error;
          duplicateSubmission = true;
        }
      }
      orderId = existing.id;
      if (duplicateSubmission) createdNewOrder = false;
    } else {
      try {
        const order = await orderRepository.create({
          tenantId: session.tenantId,
          branchId: session.branchId,
          ...(session.tableId ? { tableId: session.tableId } : {}),
          createdBy: null,
          source: "CUSTOMER_QR",
          customerSessionId: session.id,
          customerId: associatedCustomerId,
          type: session.mode === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN",
          notes: input.notes,
          items: resolved,
          subtotal,
          taxAmount,
          discountAmount,
          serviceChargeAmount: promoted.serviceChargeAmount,
          roundingAdjustment: promoted.roundingAdjustment,
          totalAmount: promoted.totalAmount,
          promotionRedemptions: promoted.redemptions,
          initialTicketStatus:
            session.mode === "TAKEAWAY" ? "PENDING_PAYMENT" : "FIRED",
          customerRequestId: customerRequestId ?? null,
          resolutionAsOf: asOf,
        });
        orderId = order.id;
        createdNewOrder = true;
        roundCreated = true;
      } catch (error) {
        if ((error as { code?: string })?.code !== "23505") throw error;
        const concurrentOrder = await customerRepository.findOpenOrderBySession(
          session.tenantId,
          session.branchId,
          session.id,
        );
        if (!concurrentOrder) throw error;
        let duplicateSubmission = false;
        if (customerRequestId) {
          duplicateSubmission =
            !!(await customerRepository.findCustomerRequestTicket(
              concurrentOrder.id,
              customerRequestId,
            ));
        }
        if (!duplicateSubmission) {
          try {
            const concurrentFull = await orderRepository.findById(
              session.tenantId,
              concurrentOrder.id,
            );
            if (!concurrentFull) throw error;
            const concurrentCustomerId =
              concurrentFull.customerId ?? associatedCustomerId;
            if (
              concurrentFull.customerId &&
              associatedCustomerId &&
              concurrentFull.customerId !== associatedCustomerId
            ) {
              throw new ValidationError(
                "This open order is already linked to a different loyalty customer",
              );
            }
            const concurrentContext = {
              ...tablePricingContext,
              ...(concurrentCustomerId
                ? { customerId: concurrentCustomerId }
                : {}),
            };
            const concurrentRedemptions =
              await promotionRepository.listRedemptionsForOrder(
                concurrentOrder.id,
              );
            const concurrentWhole = await finalizeWholeActiveOrder(
              concurrentContext,
              concurrentFull.items.filter((item) =>
                isBillableOrderItem(item),
              ) as StoredOrderLineForRepricing[],
              unresolvedLines,
              {
                ...(input.couponCode ? { couponCode: input.couponCode } : {}),
                ...(concurrentRedemptions.length
                  ? {
                      promotionIds: concurrentRedemptions.map(
                        (entry) => entry.promotionId,
                      ),
                    }
                  : {}),
                ...(concurrentCustomerId
                  ? { customerId: concurrentCustomerId }
                  : {}),
              },
            );
            const concurrentResolved = await snapshotOrderLines(
              session.tenantId,
              concurrentWhole.newLines,
              {
                branchId: session.branchId,
                channel: "CUSTOMER_QR",
                fulfillmentType: roundFulfillmentType,
                asOf,
              },
            );
            await orderRepository.fireNewTicket(
              session.tenantId,
              session.branchId,
              concurrentOrder.id,
              concurrentResolved,
              unresolvedLines.reduce((sum, line) => sum + line.subtotal, 0),
              0,
              input.notes,
              customerRequestId,
              {
                existingPricingUpdates: concurrentWhole.existingPricingUpdates,
                absoluteTotals: {
                  subtotal: concurrentWhole.subtotal,
                  taxAmount: concurrentWhole.taxAmount,
                  discountAmount: concurrentWhole.discountAmount,
                  serviceChargeAmount: concurrentWhole.serviceChargeAmount,
                  roundingAdjustment: concurrentWhole.roundingAdjustment,
                  totalAmount: concurrentWhole.totalAmount,
                },
                promotionRedemptions: concurrentWhole.redemptions,
                replacePromotionRedemptions: true,
                ...(concurrentCustomerId
                  ? { customerId: concurrentCustomerId }
                  : {}),
              },
            );
            roundCreated = true;
          } catch (nestedError) {
            if ((nestedError as { code?: string })?.code !== "23505")
              throw nestedError;
          }
        }
        orderId = concurrentOrder.id;
      }

      if (createdNewOrder && session.mode === "DINE_IN" && session.tableId) {
        const updatedTable = await tableRepository.update(
          session.tenantId,
          session.tableId,
          {
            status: "OCCUPIED",
          },
        );
        if (updatedTable) {
          await eventBus.publish(
            {
              type: "table.updated",
              payload: updatedTable as unknown as RestaurantTable,
            },
            session.tenantId,
            session.branchId,
          );
        }
      }
    }

    if (session.mode === "TAKEAWAY" && createdNewOrder) {
      await customerPaymentService.initiateTakeawayPayment(
        session.tenantId,
        session.branchId,
        orderId,
      );
    }

    const fullOrder = await orderRepository.findById(session.tenantId, orderId);
    await eventBus.publish(
      {
        type: createdNewOrder ? "order.created" : "order.updated",
        payload: fullOrder as unknown as Order,
      },
      session.tenantId,
      session.branchId,
    );

    const firedTickets = (fullOrder?.kitchenTickets ?? []).filter(
      (ticket) => ticket.status === "FIRED",
    );
    const newestTicket = firedTickets.at(-1);
    if (session.mode !== "TAKEAWAY") {
      if (newestTicket) {
        await eventBus.publish(
          {
            type: "kitchen.ticket.created",
            payload: newestTicket as unknown as KitchenTicket,
          },
          session.tenantId,
          session.branchId,
        );
      }
    }

    try {
      if (
        roundCreated &&
        newestTicket &&
        (session.mode !== "TAKEAWAY" || !createdNewOrder)
      )
        await inventoryService.deductForOrderItemsWithRetry(
          session.tenantId,
          session.branchId,
          orderId,
          newestTicket.id,
          newestTicket.items.flatMap((item) =>
            item.menuItemId === null
              ? []
              : [
                  {
                    orderItemId: item.id,
                    menuItemId: item.menuItemId,
                    variantId: item.variantId,
                    quantity: item.quantity,
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
          null,
        );
    } catch (err) {
      logger.error("customer_order.inventory_deduction_failed", toError(err), {
        orderId,
        branchId: session.branchId,
      });
    }

    return fullOrder;
  },
};
