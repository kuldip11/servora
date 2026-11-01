import { ValidationError } from "@/core/errors";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { availabilityService } from "@/modules/menu/availability/availability.service";
import { priceComboOrders } from "@/modules/menu/combos/combo-order.service";
import { menuResolver } from "@/modules/menu/menus/menu-resolver.service";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import {
  finalizeWholeActiveOrder,
  type ExistingLinePricingUpdate,
  type StoredOrderLineForRepricing,
} from "@/modules/orders/active-order-pricing";
import { isBillableOrderItem } from "@/modules/orders/order-item-billing";
import { snapshotOrderLines } from "@/modules/orders/order-line-snapshot.service";
import { orderRepository } from "@/modules/orders/order.repository";
import {
  pricingPipeline,
  type PricedLine,
} from "@/modules/orders/pricing/pricing-pipeline";
import { loyaltyRepository } from "@/modules/loyalty/loyalty.repository";
import { customerRepository } from "./customer.repository";
import { resolveCustomerRoundFulfillment } from "./customer-order.helpers";
import type { CreateCustomerOrderInput } from "./customer-order.types";
import { customerSessionService } from "./customer-session.service";

export const prepareCustomerOrder = async (
  token: string,
  input: CreateCustomerOrderInput,
) => {
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
  const combo = await priceComboOrders(roundPricingContext, input.combos ?? []);
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
  }
  const uniqueItemIds = [...new Set(realLines.map((line) => line.menuItemId))];
  for (let offset = 0; offset < uniqueItemIds.length; offset += 4) {
    const effectiveItems = await Promise.all(
      uniqueItemIds.slice(offset, offset + 4).map((itemId) =>
        availabilityService.getEffectiveItem(
          session.tenantId,
          itemId,
          session.branchId,
          {
            channel: "CUSTOMER_QR",
            fulfillmentType: roundFulfillmentType,
            asOf,
          },
        ),
      ),
    );
    if (
      effectiveItems.some(
        (item) => item.effectiveStatus !== "ACTIVE" || item.isHidden,
      )
    ) {
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

  return {
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
  };
};
