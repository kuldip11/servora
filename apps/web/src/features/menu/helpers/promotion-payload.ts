import type { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";

type PromotionForm = ReturnType<typeof usePromotionFormState>;

export const buildPromotionPayload = (form: PromotionForm) => ({
  name: form.name,
  ruleType: form.ruleType,
  scope: form.ruleType === "BOGO" ? "ORDER" : form.scope,
  ...(form.ruleType !== "BOGO" ? { value: Number(form.value) } : {}),
  scopeCategoryId:
    form.ruleType !== "BOGO" && form.scope === "CATEGORY"
      ? form.targetId
      : null,
  scopeMenuItemId:
    form.ruleType !== "BOGO" && form.scope === "ITEM" ? form.targetId : null,
  triggerMenuItemId:
    form.ruleType === "BOGO" && form.triggerType === "ITEM"
      ? form.triggerId
      : null,
  triggerCategoryId:
    form.ruleType === "BOGO" && form.triggerType === "CATEGORY"
      ? form.triggerId
      : null,
  rewardMenuItemId:
    form.ruleType === "BOGO" && form.rewardType === "ITEM"
      ? form.rewardId
      : null,
  rewardCategoryId:
    form.ruleType === "BOGO" && form.rewardType === "CATEGORY"
      ? form.rewardId
      : null,
  ...(form.ruleType === "BOGO"
    ? {
        triggerQuantity: Number(form.triggerQuantity),
        rewardQuantity: Number(form.rewardQuantity),
        rewardDiscountPercent: Number(form.rewardDiscountPercent),
      }
    : {}),
  couponCode: form.couponCode.trim() || null,
  startDate: form.startDate || null,
  endDate: form.endDate || null,
  startTime: form.startTime || null,
  endTime: form.endTime || null,
  maxUsesTotal: form.maxUsesTotal ? Number(form.maxUsesTotal) : null,
  maxUsesPerCustomer: form.maxUsesPerCustomer
    ? Number(form.maxUsesPerCustomer)
    : null,
  stackableWithLoyalty: form.stackableWithLoyalty,
});
