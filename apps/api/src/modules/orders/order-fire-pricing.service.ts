import type { AuthContext } from "@/core/auth";
import { ValidationError } from "@/core/errors";
import { availabilityRepository } from "@/modules/menu/availability/availability.repository";
import { priceComboOrders } from "@/modules/menu/combos/combo-order.service";
import { promotionRepository } from "@/modules/menu/promotions/promotion.repository";
import {
  finalizeWholeActiveOrder,
  type StoredOrderLineForRepricing,
} from "./active-order-pricing";
import { isBillableOrderItem } from "./order-item-billing";
import { assertItemsInSchedule } from "./order-fire.helpers";
import type { FireTicketInput } from "./order-fire.types";
import { snapshotOrderLines } from "./order-line-snapshot.service";
import {
  pricingPipeline,
  type PricableMenuItem,
  type PricedLine,
} from "./pricing/pricing-pipeline";
import { orderRepository } from "./order.repository";

type FireOrder = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findById>>
>;

export async function prepareOrderFirePricing(
  auth: AuthContext,
  orderId: string,
  input: FireTicketInput,
  order: FireOrder,
  regularItems: NonNullable<FireTicketInput["items"]>,
) {
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

  return { newStage4Lines, repriced, snapshottedNewLines };
}
