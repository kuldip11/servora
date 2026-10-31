import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { NotFoundError } from "@/core/errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import { promotionRepository } from "./promotion.repository";
import type { PromotionInput } from "./promotion.types";
import {
  toPromotionPersistence,
  validatePromotion,
  validatePromotionTargets,
} from "./promotion-validation";

export const promotionLifecycleService = {
  async list(auth: AuthContext) {
    requirePermission(auth, "menu:read");
    return promotionRepository.list(auth.tenantId);
  },
  async create(auth: AuthContext, input: PromotionInput) {
    requirePermission(auth, "menu:pricing:write");
    validatePromotion(input);
    await validatePromotionTargets(auth, input);
    const created = await promotionRepository.create({
      ...toPromotionPersistence(input),
      tenantId: auth.tenantId,
    });
    await menuChangeLog.record(
      auth,
      "PROMOTION",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },
  async update(auth: AuthContext, id: string, patch: Partial<PromotionInput>) {
    requirePermission(auth, "menu:pricing:write");
    const existing = await promotionRepository.findById(auth.tenantId, id);
    if (!existing) throw new NotFoundError("Promotion not found");
    const merged: PromotionInput = {
      name: patch.name ?? existing.name,
      ruleType: patch.ruleType ?? existing.ruleType,
      scope: patch.scope ?? existing.scope,
      ...(patch.value !== undefined
        ? { value: patch.value }
        : existing.value !== null
          ? { value: Number(existing.value) }
          : {}),
      ...(patch.scopeCategoryId !== undefined
        ? { scopeCategoryId: patch.scopeCategoryId }
        : existing.scopeCategoryId
          ? { scopeCategoryId: existing.scopeCategoryId }
          : {}),
      ...(patch.scopeMenuItemId !== undefined
        ? { scopeMenuItemId: patch.scopeMenuItemId }
        : existing.scopeMenuItemId
          ? { scopeMenuItemId: existing.scopeMenuItemId }
          : {}),
      ...(patch.couponCode !== undefined
        ? { couponCode: patch.couponCode }
        : existing.couponCode
          ? { couponCode: existing.couponCode }
          : {}),
      ...(patch.startDate !== undefined
        ? { startDate: patch.startDate }
        : existing.startDate
          ? { startDate: existing.startDate }
          : {}),
      ...(patch.endDate !== undefined
        ? { endDate: patch.endDate }
        : existing.endDate
          ? { endDate: existing.endDate }
          : {}),
      ...(patch.startTime !== undefined
        ? { startTime: patch.startTime }
        : existing.startTime
          ? { startTime: existing.startTime }
          : {}),
      ...(patch.endTime !== undefined
        ? { endTime: patch.endTime }
        : existing.endTime
          ? { endTime: existing.endTime }
          : {}),
      maxUsesTotal:
        patch.maxUsesTotal !== undefined
          ? patch.maxUsesTotal
          : existing.maxUsesTotal,
      maxUsesPerCustomer:
        patch.maxUsesPerCustomer !== undefined
          ? patch.maxUsesPerCustomer
          : existing.maxUsesPerCustomer,
      ...(patch.triggerMenuItemId !== undefined
        ? { triggerMenuItemId: patch.triggerMenuItemId }
        : existing.triggerMenuItemId
          ? { triggerMenuItemId: existing.triggerMenuItemId }
          : {}),
      ...(patch.triggerCategoryId !== undefined
        ? { triggerCategoryId: patch.triggerCategoryId }
        : existing.triggerCategoryId
          ? { triggerCategoryId: existing.triggerCategoryId }
          : {}),
      ...(patch.rewardMenuItemId !== undefined
        ? { rewardMenuItemId: patch.rewardMenuItemId }
        : existing.rewardMenuItemId
          ? { rewardMenuItemId: existing.rewardMenuItemId }
          : {}),
      ...(patch.rewardCategoryId !== undefined
        ? { rewardCategoryId: patch.rewardCategoryId }
        : existing.rewardCategoryId
          ? { rewardCategoryId: existing.rewardCategoryId }
          : {}),
      ...(patch.rewardDiscountPercent !== undefined
        ? { rewardDiscountPercent: patch.rewardDiscountPercent }
        : existing.rewardDiscountPercent
          ? { rewardDiscountPercent: Number(existing.rewardDiscountPercent) }
          : {}),
      ...(patch.triggerQuantity !== undefined
        ? { triggerQuantity: patch.triggerQuantity }
        : existing.triggerQuantity
          ? { triggerQuantity: existing.triggerQuantity }
          : {}),
      ...(patch.rewardQuantity !== undefined
        ? { rewardQuantity: patch.rewardQuantity }
        : existing.rewardQuantity
          ? { rewardQuantity: existing.rewardQuantity }
          : {}),
      stackableWithLoyalty:
        patch.stackableWithLoyalty ?? existing.stackableWithLoyalty,
      isActive: patch.isActive ?? existing.isActive,
    };
    validatePromotion(merged);
    await validatePromotionTargets(auth, merged);
    const updated = await promotionRepository.update(
      auth.tenantId,
      id,
      toPromotionPersistence(merged),
    );
    if (!updated) throw new NotFoundError("Promotion not found");
    await menuChangeLog.record(
      auth,
      "PROMOTION",
      id,
      "UPDATED",
      buildDiff(existing, updated),
    );
    return updated;
  },
  async remove(auth: AuthContext, id: string) {
    requirePermission(auth, "menu:pricing:write");
    const existing = await promotionRepository.findById(auth.tenantId, id);
    if (!existing) return;
    await promotionRepository.remove(auth.tenantId, id);
    await menuChangeLog.record(
      auth,
      "PROMOTION",
      id,
      "DELETED",
      buildDiff(existing, null),
    );
  },
  async stats(auth: AuthContext, id: string) {
    requirePermission(auth, "menu:read");
    return promotionRepository.stats(auth.tenantId, id);
  },
};
