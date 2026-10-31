import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { ValidationError } from "@/core/errors";
import { pricingPipeline } from "@/modules/orders/pricing/pricing-pipeline";
import { PREVIEW_PROMOTION_ID } from "./constants";
import type { PromotionRow } from "./promotion.repository";
import type { PromotionPreviewInput } from "./promotion.types";
import {
  toPromotionPersistence,
  validatePromotion,
  validatePromotionTargets,
} from "./promotion-validation";

export const promotionPreviewService = {
  async preview(auth: AuthContext, input: PromotionPreviewInput) {
    requirePermission(auth, "menu:pricing:write");
    if (!auth.branchId)
      throw new ValidationError("Select a branch to preview pricing");
    if (!input.items.length)
      throw new ValidationError(
        "Add at least one menu item to preview this promotion",
      );
    validatePromotion(input.promotion);
    await validatePromotionTargets(auth, input.promotion);

    const asOf = new Date();
    const persisted = toPromotionPersistence({
      ...input.promotion,
      isActive: true,
    });
    const previewPromotion: PromotionRow = {
      id: PREVIEW_PROMOTION_ID,
      tenantId: auth.tenantId,
      name: persisted.name,
      ruleType: persisted.ruleType,
      scope: persisted.scope ?? "ORDER",
      scopeCategoryId: persisted.scopeCategoryId ?? null,
      scopeMenuItemId: persisted.scopeMenuItemId ?? null,
      value: persisted.value ?? null,
      couponCode: persisted.couponCode ?? null,
      startDate: persisted.startDate ?? null,
      endDate: persisted.endDate ?? null,
      startTime: persisted.startTime ?? null,
      endTime: persisted.endTime ?? null,
      maxUsesTotal: persisted.maxUsesTotal ?? null,
      maxUsesPerCustomer: persisted.maxUsesPerCustomer ?? null,
      triggerMenuItemId: persisted.triggerMenuItemId ?? null,
      triggerCategoryId: persisted.triggerCategoryId ?? null,
      rewardMenuItemId: persisted.rewardMenuItemId ?? null,
      rewardCategoryId: persisted.rewardCategoryId ?? null,
      rewardDiscountPercent: persisted.rewardDiscountPercent ?? null,
      triggerQuantity: persisted.triggerQuantity ?? null,
      rewardQuantity: persisted.rewardQuantity ?? null,
      stackableWithLoyalty: persisted.stackableWithLoyalty ?? true,
      isActive: true,
      createdAt: asOf,
      updatedAt: asOf,
    };
    const context = {
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      channel: "STAFF" as const,
      fulfillmentType: "DINE_IN" as const,
      asOf,
    };
    const base = await pricingPipeline.price(context, input.items);
    const finalized = await pricingPipeline.finalize(context, base.lines, {
      promotionIds: [PREVIEW_PROMOTION_ID],
      candidatePromotions: [previewPromotion],
    });
    return {
      asOf: asOf.toISOString(),
      subtotal: finalized.subtotal,
      discountAmount: finalized.discountAmount,
      taxAmount: finalized.taxAmount,
      serviceChargeAmount: finalized.serviceChargeAmount,
      roundingAdjustment: finalized.roundingAdjustment,
      totalAmount: finalized.totalAmount,
      lines: finalized.lines,
    };
  },
};
