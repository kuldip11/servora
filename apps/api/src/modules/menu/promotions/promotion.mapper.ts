import type { PromotionResponse } from "@pos/contracts";

export const toPromotionResponse = (row: any): PromotionResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  ruleType: row.ruleType,
  scope: row.scope,
  scopeCategoryId: row.scopeCategoryId ?? null,
  scopeMenuItemId: row.scopeMenuItemId ?? null,
  value: row.value ?? null,
  couponCode: row.couponCode ?? null,
  startDate: row.startDate ?? null,
  endDate: row.endDate ?? null,
  startTime: row.startTime ?? null,
  endTime: row.endTime ?? null,
  maxUsesTotal: row.maxUsesTotal ?? null,
  maxUsesPerCustomer: row.maxUsesPerCustomer ?? null,
  triggerMenuItemId: row.triggerMenuItemId ?? null,
  triggerCategoryId: row.triggerCategoryId ?? null,
  rewardMenuItemId: row.rewardMenuItemId ?? null,
  rewardCategoryId: row.rewardCategoryId ?? null,
  rewardDiscountPercent: row.rewardDiscountPercent ?? null,
  triggerQuantity: row.triggerQuantity ?? null,
  rewardQuantity: row.rewardQuantity ?? null,
  stackableWithLoyalty: Boolean(row.stackableWithLoyalty),
  isActive: Boolean(row.isActive),
});

import type { PromotionPreviewResponse } from "@pos/contracts";

export const toPromotionPreviewResponse = (
  result: any,
): PromotionPreviewResponse => ({
  asOf: result.asOf,
  subtotal: result.subtotal,
  discountAmount: result.discountAmount,
  taxAmount: result.taxAmount,
  serviceChargeAmount: result.serviceChargeAmount,
  roundingAdjustment: result.roundingAdjustment,
  totalAmount: result.totalAmount,
  lines: (result.lines ?? []).map((line: any) => ({
    menuItemId: line.menuItemId ?? null,
    menuItemName: line.menuItemName,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    ...(line.variantName ? { variantName: line.variantName } : {}),
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    subtotal: line.subtotal,
    taxRate: line.taxRate,
    ...(line.taxMode ? { taxMode: line.taxMode } : {}),
    fulfillmentType: line.fulfillmentType,
    modifiers: (line.modifiers ?? []).map((modifier: any) => ({
      modifierId: modifier.modifierId,
      modifierGroupName: modifier.modifierGroupName,
      name: modifier.name,
      price: modifier.price,
      quantity: modifier.quantity,
      ...(modifier.zoneLabel ? { zoneLabel: modifier.zoneLabel } : {}),
    })),
    pricingAttribution: {
      BASE_PRICE: line.pricingAttribution.BASE_PRICE,
      VARIANT: line.pricingAttribution.VARIANT,
      MODIFIER: line.pricingAttribution.MODIFIER,
      ...(line.pricingAttribution.COMBO != null
        ? { COMBO: line.pricingAttribution.COMBO }
        : {}),
      ...(line.pricingAttribution.PROMOTION != null
        ? { PROMOTION: line.pricingAttribution.PROMOTION }
        : {}),
      ...(line.pricingAttribution.LOYALTY != null
        ? { LOYALTY: line.pricingAttribution.LOYALTY }
        : {}),
      ...(line.pricingAttribution.TAXABLE_BASE != null
        ? { TAXABLE_BASE: line.pricingAttribution.TAXABLE_BASE }
        : {}),
      ...(line.pricingAttribution.CATEGORY_ID
        ? { CATEGORY_ID: line.pricingAttribution.CATEGORY_ID }
        : {}),
    },
  })),
});
