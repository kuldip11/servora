import { createLogger, toError } from "@/core/logger/logger";
import type { FireTicketRequest } from "@pos/contracts";
import type { KitchenTicket, Order } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { DomainRuleError, ValidationError } from "@/core/errors";
import { eventBus } from "@/lib/event-bus";
import { availabilityRepository } from "@/modules/menu/availability/availability.repository";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";
import {
  priceComboOrders,
  type ComboOrderSelection,
} from "@/modules/menu/combos/combo-order.service";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import {
  requireOrdersPermission,
  assertOrderResourceAccess,
} from "./orders-authorization";
import { orderRepository } from "./order.repository";
import {
  pricingPipeline,
  type OrderItemInput,
  type PricableMenuItem,
  type PricedLine,
} from "./pricing/pricing-pipeline";
import { snapshotOrderLines } from "./order-line-snapshot.service";
import {
  finalizeWholeActiveOrder,
  type StoredOrderLineForRepricing,
} from "./active-order-pricing";
import { isBillableOrderItem } from "./order-item-billing";
import { orderNotFound, orderNotOpen } from "./order.errors";
import {
  assertCourseSequencingAllowed,
  assertItemsInSchedule,
  requestedCourseNumbers,
  singleCourseNumber,
} from "./order-fire.helpers";

const logger = createLogger({}, "order-fire");

export type FireTicketInput = FireTicketRequest;

export const orderFireService = {
  async fireTicket(auth: AuthContext, orderId: string, input: FireTicketInput) {
    requireOrdersPermission(auth, "orders:update");
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw orderNotFound(orderId);
    assertOrderResourceAccess(auth, order.branchId);

    if (order.status !== "OPEN") throw orderNotOpen(order.status);

    const regularItems = input.items ?? [];
    await assertCourseSequencingAllowed(
      auth.tenantId,
      regularItems,
      input.combos ?? [],
    );
    const fireCourseNumbers = requestedCourseNumbers(
      regularItems,
      input.combos ?? [],
    );
    if (
      fireCourseNumbers.length > 0 &&
      fireCourseNumbers.length !==
        regularItems.length + (input.combos?.length ?? 0)
    ) {
      throw new ValidationError(
        "Every line must have a course when course sequencing is used",
      );
    }
    if (regularItems.length === 0 && !input.combos?.length) {
      throw new ValidationError("Order requires at least one item or combo");
    }

    const asOf = new Date();
    const menuItemIds = regularItems.map((item) => item.menuItemId);
    const menuItemsData = await availabilityRepository.findByIds(
      auth.tenantId,
      menuItemIds,
      order.branchId,
      asOf,
    );
    const itemMap = new Map<string, PricableMenuItem>(
      menuItemsData.map(
        (item) => [item.id, item as unknown as PricableMenuItem] as const,
      ),
    );
    await assertItemsInSchedule(
      auth.tenantId,
      order.branchId,
      itemMap,
      menuItemIds,
      order.type,
      asOf,
    );

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
    const regular = await pricingPipeline.price(pricingContext, regularItems);
    const combo = await priceComboOrders(pricingContext, input.combos ?? []);
    const newStage4Lines = [...regular.lines, ...combo.lines];

    if (combo.lines.length) {
      const comboIds = combo.lines.flatMap((line) =>
        line.menuItemId === null ? [] : [line.menuItemId],
      );
      const comboItems = await availabilityRepository.findByIds(
        auth.tenantId,
        comboIds,
        order.branchId,
        asOf,
      );
      await assertItemsInSchedule(
        auth.tenantId,
        order.branchId,
        new Map(
          comboItems.map(
            (item) => [item.id, item as unknown as PricableMenuItem] as const,
          ),
        ),
        comboIds,
        order.type,
        asOf,
      );
    }

    if (
      order.billingMode === "PER_COVER" &&
      (input.couponCode?.trim() || input.promotionIds?.length)
    ) {
      throw new ValidationError(
        "Per-cover pricing is snapshotted when the order is created; item-round promotion changes are not allowed",
      );
    }

    const priorRedemptions =
      await promotionRepository.listRedemptionsForOrder(orderId);
    const continuedPromotionIds = [
      ...new Set([
        ...priorRedemptions.map((entry) => entry.promotionId),
        ...(input.promotionIds ?? []),
      ]),
    ];
    const activeExistingItems = order.items.filter((item) =>
      isBillableOrderItem(item),
    );
    const repriced =
      order.billingMode === "PER_COVER"
        ? {
            existingPricingUpdates: [] as Array<{
              id: string;
              pricingAttribution: PricedLine["pricingAttribution"];
              taxMode: "INCLUSIVE" | "EXCLUSIVE";
            }>,
            newLines: newStage4Lines.map((line) => ({
              ...line,
              billingExcluded: true,
            })),
            subtotal: Number(order.subtotal),
            taxAmount: Number(order.taxAmount),
            discountAmount: Number(order.discountAmount),
            serviceChargeAmount: Number(order.serviceChargeAmount),
            roundingAdjustment: Number(order.roundingAdjustment),
            totalAmount: Number(order.totalAmount),
            redemptions: priorRedemptions,
          }
        : await finalizeWholeActiveOrder(
            pricingContext,
            activeExistingItems as StoredOrderLineForRepricing[],
            newStage4Lines,
            {
              ...(input.couponCode ? { couponCode: input.couponCode } : {}),
              ...(continuedPromotionIds.length
                ? { promotionIds: continuedPromotionIds }
                : {}),
              ...(order.customerId ? { customerId: order.customerId } : {}),
            },
          );

    const snapshottedNewLines = await snapshotOrderLines(
      auth.tenantId,
      repriced.newLines,
      pricingContext,
    );
    const courseNumber = singleCourseNumber(regularItems, input.combos ?? []);
    if (courseNumber !== undefined && courseNumber > 1) {
      const hasPriorCourse = await ticketRepository.hasCourseNumber(
        auth.tenantId,
        orderId,
        courseNumber - 1,
      );
      if (!hasPriorCourse) {
        throw new ValidationError(
          `Course ${courseNumber - 1} must exist before Course ${courseNumber} can be added`,
        );
      }
    }
    const courseStatus =
      courseNumber !== undefined &&
      (await ticketRepository.shouldHoldCourse(
        auth.tenantId,
        orderId,
        courseNumber,
      ))
        ? ("HELD" as const)
        : ("FIRED" as const);

    let ticket;
    try {
      ticket = await orderRepository.fireNewTicket(
        auth.tenantId,
        order.branchId,
        orderId,
        snapshottedNewLines,
        newStage4Lines.reduce((sum, line) => sum + line.subtotal, 0),
        0,
        input.notes,
        null,
        {
          existingPricingUpdates: repriced.existingPricingUpdates,
          absoluteTotals: {
            subtotal: repriced.subtotal,
            taxAmount: repriced.taxAmount,
            discountAmount: repriced.discountAmount,
            serviceChargeAmount: repriced.serviceChargeAmount,
            roundingAdjustment: repriced.roundingAdjustment,
            totalAmount: repriced.totalAmount,
          },
          promotionRedemptions: repriced.redemptions,
          replacePromotionRedemptions: true,
        },
        courseNumber === undefined
          ? undefined
          : { number: courseNumber, status: courseStatus },
      );
    } catch (error) {
      if (
        error instanceof DomainRuleError &&
        error.details?.reason === "MANUAL_STOCK_DEPLETED"
      ) {
        throw new ValidationError(
          "One or more count-tracked items sold out while this round was being confirmed",
        );
      }
      throw error;
    }

    const fullOrder = await orderRepository.findById(auth.tenantId, orderId);
    await eventBus.publish(
      { type: "order.updated", payload: fullOrder as unknown as Order },
      auth.tenantId,
      order.branchId,
    );
    const createdTicket = fullOrder?.kitchenTickets?.find(
      (candidate) => candidate.id === ticket.id,
    );
    if (createdTicket) {
      await eventBus.publish(
        {
          type: "kitchen.ticket.created",
          payload: createdTicket as unknown as KitchenTicket,
        },
        auth.tenantId,
        order.branchId,
      );
    }

    try {
      if (createdTicket?.status === "FIRED") {
        await inventoryService.deductForOrderItemsWithRetry(
          auth.tenantId,
          order.branchId,
          orderId,
          ticket.id,
          createdTicket.items.flatMap((item) =>
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
      }
    } catch (err) {
      logger.error("order.inventory_deduction_failed", toError(err), {
        orderId,
        branchId: order.branchId,
      });
    }

    return fullOrder;
  },
};
