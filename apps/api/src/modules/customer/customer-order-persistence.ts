import { ValidationError } from "@/core/errors";
import { eventBus } from "@/lib/event-bus";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import {
  finalizeWholeActiveOrder,
  type StoredOrderLineForRepricing,
} from "@/modules/orders/active-order-pricing";
import { isBillableOrderItem } from "@/modules/orders/order-item-billing";
import { snapshotOrderLines } from "@/modules/orders/order-line-snapshot.service";
import { orderRepository } from "@/modules/orders/order.repository";
import { toTableResponse } from "@/modules/tables/table.mapper";
import { tableRepository } from "@/modules/tables/table.repository";
import { customerRepository } from "./customer.repository";
import type { CreateCustomerOrderInput } from "./customer-order.types";
import type { prepareCustomerOrder } from "./customer-order-preparation";

export const persistCustomerOrder = async (
  prepared: Awaited<ReturnType<typeof prepareCustomerOrder>>,
  input: CreateCustomerOrderInput,
  customerRequestId?: string,
) => {
  const {
    session,
    roundFulfillmentType,
    tablePricingContext,
    unresolvedLines,
    resolved,
    existing,
    associatedCustomerId,
    promoted,
    existingPricingUpdates,
    asOf,
    subtotal,
    discountAmount,
    taxAmount,
  } = prepared;
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
            payload: toTableResponse(updatedTable),
          },
          session.tenantId,
          session.branchId,
        );
      }
    }
  }

  return { orderId, createdNewOrder, roundCreated, session };
};
