import type { AuthContext } from "@/core/auth";
import { availabilityRepository } from "@/modules/menu/availability/availability.repository";
import { priceComboOrders } from "@/modules/menu/combos/combo-order.service";
import { assertItemsInSchedule } from "./order-fire.helpers";
import { snapshotOrderLines } from "./order-line-snapshot.service";
import {
  pricingPipeline,
  type PricableMenuItem,
  type PricedLine,
} from "./pricing/pricing-pipeline";
import type { CreateOrderInput } from "./create-order.types";

type BillingMode = NonNullable<CreateOrderInput["billingMode"]>;

export async function prepareCreateOrderPricing(
  auth: AuthContext,
  input: CreateOrderInput,
  branchId: string,
  billingMode: BillingMode,
) {
  const regularItems = input.items ?? [];
  const asOf = new Date();
  const menuItemIds = regularItems.map((i) => i.menuItemId);
  const menuItemsData = await availabilityRepository.findByIds(
    auth.tenantId,
    menuItemIds,
    branchId,
    asOf,
  );
  const itemMap = new Map<string, PricableMenuItem>(
    menuItemsData.map((m) => [m.id, m as unknown as PricableMenuItem] as const),
  );

  await assertItemsInSchedule(
    auth.tenantId,
    branchId,
    itemMap,
    menuItemIds,
    input.type,
    asOf,
  );

  const pricingContext = {
    tenantId: auth.tenantId,
    branchId,
    channel: "STAFF" as const,
    fulfillmentType: input.type,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.customerGroupId
      ? { customerGroupId: input.customerGroupId }
      : {}),
    asOf,
  };
  const regular = await pricingPipeline.price(pricingContext, regularItems);
  const combo = await priceComboOrders(pricingContext, input.combos ?? []);
  const resolved = [...regular.lines, ...combo.lines];

  if (combo.lines.length) {
    const comboIds = combo.lines.flatMap((line) =>
      line.menuItemId === null ? [] : [line.menuItemId],
    );
    const comboItems = await availabilityRepository.findByIds(
      auth.tenantId,
      comboIds,
      branchId,
      asOf,
    );
    await assertItemsInSchedule(
      auth.tenantId,
      branchId,
      new Map(comboItems.map((m) => [m.id, m as unknown as PricableMenuItem])),
      comboIds,
      input.type,
      asOf,
    );
  }
  const promotionOptions = {
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    ...(input.promotionIds?.length ? { promotionIds: input.promotionIds } : {}),
    ...(input.customerId ? { customerId: input.customerId } : {}),
  };
  let billablePricing;
  let linesToPersist = resolved;
  let perCoverRate: number | null = null;
  if (billingMode === "PER_COVER") {
    const cover = await pricingPipeline.resolvePerCoverRate(
      pricingContext,
      input.perCoverPriceRuleId!,
    );
    perCoverRate = cover.rate;
    const coverLine: PricedLine = {
      menuItemId: null,
      menuItemName: "Cover charge",
      quantity: input.coverCount!,
      unitPrice: cover.rate,
      subtotal: cover.rate * input.coverCount!,
      taxRate: cover.taxRate,
      fulfillmentType: input.type === "DINE_IN" ? "DINE_IN" : "TAKEAWAY",
      modifiers: [],
      pricingAttribution: { BASE_PRICE: cover.rate, VARIANT: 0, MODIFIER: 0 },
    };

    billablePricing = await pricingPipeline.finalize(
      pricingContext,
      [coverLine],
      promotionOptions,
    );
    linesToPersist = resolved.map((line) => ({
      ...line,
      billingExcluded: true,
    }));
  } else {
    billablePricing = await pricingPipeline.finalize(
      pricingContext,
      resolved,
      promotionOptions,
    );
    linesToPersist = billablePricing.lines;
  }
  const snapshottedLines = await snapshotOrderLines(
    auth.tenantId,
    linesToPersist,
    pricingContext,
  );

  return { asOf, billablePricing, perCoverRate, snapshottedLines };
}
