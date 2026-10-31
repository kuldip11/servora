import type { AuthContext } from "@/core/auth";
import { ValidationError } from "@/core/errors";
import { itemRepository } from "@/modules/menu/items/item.repository";
import { assertMenuResourceBranch } from "@/modules/menu/menu-authorization";
import type { NewPromotion } from "./promotion.repository";
import type { PromotionInput } from "./promotion.types";

export const validatePromotion = (input: PromotionInput) => {
  if (input.ruleType === "PERCENTAGE") {
    if (input.value === undefined || input.value <= 0 || input.value > 100) {
      throw new ValidationError(
        "Percentage promotion must be greater than 0 and at most 100%",
      );
    }
  } else if (input.ruleType === "FIXED_AMOUNT") {
    if (input.value === undefined || input.value <= 0)
      throw new ValidationError(
        "Fixed promotion amount must be greater than 0",
      );
  } else {
    const triggerTargets =
      Number(Boolean(input.triggerMenuItemId)) +
      Number(Boolean(input.triggerCategoryId));
    const rewardTargets =
      Number(Boolean(input.rewardMenuItemId)) +
      Number(Boolean(input.rewardCategoryId));
    if (triggerTargets !== 1)
      throw new ValidationError(
        "BOGO requires exactly one trigger item or category",
      );
    if (rewardTargets > 1)
      throw new ValidationError(
        "BOGO reward can target at most one item or category",
      );
    if (
      !input.rewardDiscountPercent ||
      input.rewardDiscountPercent <= 0 ||
      input.rewardDiscountPercent > 100
    ) {
      throw new ValidationError(
        "BOGO reward discount must be greater than 0 and at most 100%",
      );
    }
    if (
      !input.triggerQuantity ||
      input.triggerQuantity < 1 ||
      !input.rewardQuantity ||
      input.rewardQuantity < 1
    ) {
      throw new ValidationError(
        "BOGO trigger and reward quantities must be positive integers",
      );
    }
  }
  if (input.ruleType === "BOGO") {
    if (
      input.scope !== "ORDER" ||
      input.scopeCategoryId ||
      input.scopeMenuItemId
    ) {
      throw new ValidationError(
        "BOGO scope is defined by its buy/reward targets and must use ORDER scope",
      );
    }
  } else {
    if (
      input.scope === "ORDER" &&
      (input.scopeCategoryId || input.scopeMenuItemId)
    )
      throw new ValidationError(
        "Order promotions cannot target an item/category",
      );
    if (
      input.scope === "CATEGORY" &&
      (!input.scopeCategoryId || input.scopeMenuItemId)
    )
      throw new ValidationError(
        "Category promotion requires exactly one category target",
      );
    if (
      input.scope === "ITEM" &&
      (!input.scopeMenuItemId || input.scopeCategoryId)
    )
      throw new ValidationError(
        "Item promotion requires exactly one item target",
      );
  }
  if (input.startDate && input.endDate && input.startDate > input.endDate)
    throw new ValidationError("Promotion start date must be before end date");
};

export const validatePromotionTargets = async (
  auth: AuthContext,
  input: PromotionInput,
) => {
  const itemIds = new Set<string>();
  const categoryIds = new Set<string>();
  for (const id of [
    input.scopeMenuItemId,
    input.triggerMenuItemId,
    input.rewardMenuItemId,
  ]) {
    if (id) itemIds.add(id);
  }
  for (const id of [
    input.scopeCategoryId,
    input.triggerCategoryId,
    input.rewardCategoryId,
  ]) {
    if (id) categoryIds.add(id);
  }

  for (const itemId of itemIds) {
    const item = await itemRepository.findById(auth.tenantId, itemId);
    if (!item)
      throw new ValidationError(
        "Promotion menu item does not belong to this tenant",
      );
    assertMenuResourceBranch(auth, item.branchId, { allowShared: true });
  }
  for (const categoryId of categoryIds) {
    const category = await itemRepository.findCategory(
      auth.tenantId,
      categoryId,
    );
    if (!category)
      throw new ValidationError(
        "Promotion category does not belong to this tenant",
      );
    assertMenuResourceBranch(auth, category.branchId, { allowShared: true });
  }
};

export const toPromotionPersistence = (input: PromotionInput): NewPromotion => {
  validatePromotion(input);
  return {
    name: input.name.trim(),
    ruleType: input.ruleType,
    scope: input.scope,
    scopeCategoryId: input.scopeCategoryId ?? null,
    scopeMenuItemId: input.scopeMenuItemId ?? null,
    value: input.ruleType === "BOGO" ? null : input.value!.toFixed(2),
    couponCode: input.couponCode?.trim().toUpperCase() ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    maxUsesTotal: input.maxUsesTotal ?? null,
    maxUsesPerCustomer: input.maxUsesPerCustomer ?? null,
    triggerMenuItemId:
      input.ruleType === "BOGO" ? (input.triggerMenuItemId ?? null) : null,
    triggerCategoryId:
      input.ruleType === "BOGO" ? (input.triggerCategoryId ?? null) : null,
    rewardMenuItemId:
      input.ruleType === "BOGO" ? (input.rewardMenuItemId ?? null) : null,
    rewardCategoryId:
      input.ruleType === "BOGO" ? (input.rewardCategoryId ?? null) : null,
    rewardDiscountPercent:
      input.ruleType === "BOGO"
        ? input.rewardDiscountPercent!.toFixed(2)
        : null,
    triggerQuantity: input.ruleType === "BOGO" ? input.triggerQuantity! : null,
    rewardQuantity: input.ruleType === "BOGO" ? input.rewardQuantity! : null,
    stackableWithLoyalty: input.stackableWithLoyalty ?? true,
    isActive: input.isActive ?? true,
  } as NewPromotion;
};
