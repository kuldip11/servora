import type { AuthContext } from "@/core/auth";
import { DomainRuleError, ValidationError } from "@/core/errors";
import { metrics } from "@/core/observability/metrics";
import { completeCreatedOrder } from "./create-order-completion.service";
import { prepareCreateOrderPricing } from "./create-order-pricing.service";
import type { CreateOrderInput } from "./create-order.types";
import { validateCreateOrder } from "./create-order-validation.service";
import { orderRepository } from "./order.repository";

export type { CreateOrderInput } from "./create-order.types";

export const createOrderService = {
  async create(auth: AuthContext, input: CreateOrderInput) {
    const { branchId, billingMode } = await validateCreateOrder(auth, input);
    const { asOf, billablePricing, perCoverRate, snapshottedLines } =
      await prepareCreateOrderPricing(auth, input, branchId, billingMode);

    let order;
    try {
      order = await orderRepository.create({
        tenantId: auth.tenantId,
        branchId,
        tableId: input.tableId,
        createdBy: auth.userId,
        customerId: input.customerId ?? null,
        customerGroupId: input.customerGroupId ?? null,
        type: input.type,
        billingMode,
        coverCount: billingMode === "PER_COVER" ? input.coverCount! : null,
        perCoverPriceRuleId:
          billingMode === "PER_COVER" ? input.perCoverPriceRuleId! : null,
        perCoverRate,
        notes: input.notes,
        items: snapshottedLines,
        subtotal: billablePricing.subtotal,
        taxAmount: billablePricing.taxAmount,
        discountAmount: billablePricing.discountAmount,
        serviceChargeAmount: billablePricing.serviceChargeAmount,
        roundingAdjustment: billablePricing.roundingAdjustment,
        totalAmount: billablePricing.totalAmount,
        promotionRedemptions: billablePricing.redemptions,
        resolutionAsOf: asOf,
      });
    } catch (error) {
      metrics.increment("servora_order_processing_errors_total", {
        stage: "persist",
      });
      if (
        error instanceof DomainRuleError &&
        error.details?.reason === "MANUAL_STOCK_DEPLETED"
      ) {
        throw new ValidationError(
          "One or more count-tracked items sold out while this order was being confirmed",
        );
      }
      throw error;
    }

    return completeCreatedOrder(auth, input, branchId, order);
  },
};
