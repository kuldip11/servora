import type { MenuItemStatus } from "@pos/types";
import { writeAudit } from "@/core/audit";
import { ValidationError } from "@/core/errors";
import { eventBus } from "@/lib/event-bus";
import { itemNotFound } from "./availability.errors";
import { availabilityRepository } from "./availability.repository";

export const availabilityInventoryService = {
  async getEffectiveVariant(tenantId: string, variantId: string) {
    const variant = await availabilityRepository.findVariant(variantId);
    if (!variant || variant.menuItem.tenantId !== tenantId)
      throw itemNotFound(variantId);
    if (variant.manualOverrideStatus) {
      return {
        ...variant,
        effectiveStatus: variant.manualOverrideStatus,
        availabilityReason:
          variant.manualOverrideReason ?? "Manual availability override",
      };
    }
    if (variant.manualStockCount != null && variant.manualStockCount <= 0) {
      return {
        ...variant,
        effectiveStatus: "OUT_OF_STOCK" as const,
        availabilityReason: "Manual stock count depleted",
      };
    }
    return {
      ...variant,
      effectiveStatus: variant.status,
      availabilityReason: variant.manualOverrideReason,
    };
  },

  async setVariantOverride(
    tenantId: string,
    variantId: string,
    status: MenuItemStatus | null,
    reason: string | null,
  ) {
    await availabilityInventoryService.getEffectiveVariant(tenantId, variantId);
    return availabilityRepository.setVariantOverride(
      variantId,
      status,
      status ? reason?.trim() || "Variant manually unavailable" : null,
    );
  },

  async applyInventoryItemSignal(
    tenantId: string,
    branchId: string,
    itemId: string,
    canSatisfy: boolean,
  ) {
    const item = await availabilityRepository.findItemBasics(tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    if (item.branchId !== null && item.branchId !== branchId) return item;
    if (item.status !== "ACTIVE" && item.status !== "OUT_OF_STOCK") return item;
    const computedStatus = canSatisfy ? "ACTIVE" : "OUT_OF_STOCK";
    const reason = canSatisfy ? null : "Insufficient inventory";
    if (item.status === computedStatus && item.availabilityReason === reason)
      return item;
    const updated = await availabilityRepository.setComputedItemStatus(
      tenantId,
      itemId,
      computedStatus,
      reason,
    );
    if (!updated) throw itemNotFound(itemId);
    const effectiveStatus = item.manualOverrideStatus ?? computedStatus;
    await Promise.all([
      writeAudit({
        tenantId,
        branchId,
        userId: null,
        action: "MENU_AVAILABILITY_COMPUTED_CHANGED",
        entity: "menu_item",
        entityId: itemId,
        metadata: {
          source: "INVENTORY",
          computedStatus,
          effectiveStatus,
          reason,
        },
      }),
      eventBus.publish(
        {
          type: "menu.availability.updated",
          payload: {
            source: "INVENTORY",
            entityType: "ITEM",
            entityId: itemId,
            menuItemId: itemId,
            computedStatus,
            effectiveStatus,
            reason,
          },
        },
        tenantId,
        branchId,
      ),
    ]);
    return updated;
  },

  async applyInventoryVariantSignal(
    tenantId: string,
    branchId: string,
    variantId: string,
    canSatisfy: boolean,
  ) {
    const variant = await availabilityRepository.findVariant(variantId);
    if (!variant || variant.menuItem.tenantId !== tenantId)
      throw itemNotFound(variantId);
    if (
      variant.menuItem.branchId !== null &&
      variant.menuItem.branchId !== branchId
    )
      return variant;
    if (variant.status !== "ACTIVE" && variant.status !== "OUT_OF_STOCK")
      return variant;
    const computedStatus = canSatisfy ? "ACTIVE" : "OUT_OF_STOCK";
    if (variant.status === computedStatus) return variant;
    const updated = await availabilityRepository.setComputedVariantStatus(
      variantId,
      computedStatus,
    );
    const effectiveStatus = variant.manualOverrideStatus ?? computedStatus;
    await Promise.all([
      writeAudit({
        tenantId,
        branchId,
        userId: null,
        action: "MENU_AVAILABILITY_COMPUTED_CHANGED",
        entity: "menu_item_variant",
        entityId: variantId,
        metadata: {
          source: "INVENTORY",
          menuItemId: variant.menuItemId,
          computedStatus,
          effectiveStatus,
        },
      }),
      eventBus.publish(
        {
          type: "menu.availability.updated",
          payload: {
            source: "INVENTORY",
            entityType: "VARIANT",
            entityId: variantId,
            menuItemId: variant.menuItemId,
            computedStatus,
            effectiveStatus,
            reason:
              computedStatus === "OUT_OF_STOCK"
                ? "Insufficient inventory"
                : null,
          },
        },
        tenantId,
        branchId,
      ),
    ]);
    return updated;
  },

  async applyInventoryModifierSignal(
    tenantId: string,
    branchId: string,
    menuItemId: string,
    optionId: string,
    canSatisfy: boolean,
  ) {
    const option = await availabilityRepository.findModifierOptionForItem(
      tenantId,
      menuItemId,
      optionId,
    );
    if (!option) throw itemNotFound(optionId);
    if (option.computedAvailability === canSatisfy) return option;
    const effectiveAvailability =
      option.manualOverrideAvailability ?? canSatisfy;
    const updated =
      await availabilityRepository.setComputedModifierAvailability(
        optionId,
        canSatisfy,
      );
    await Promise.all([
      writeAudit({
        tenantId,
        branchId,
        userId: null,
        action: "MENU_AVAILABILITY_COMPUTED_CHANGED",
        entity: "modifier_option",
        entityId: optionId,
        metadata: {
          source: "INVENTORY",
          menuItemId,
          computedAvailability: canSatisfy,
          effectiveAvailability,
        },
      }),
      eventBus.publish(
        {
          type: "menu.availability.updated",
          payload: {
            source: "INVENTORY",
            entityType: "MODIFIER_OPTION",
            entityId: optionId,
            menuItemId,
            computedAvailability: canSatisfy,
            effectiveAvailability,
            reason: canSatisfy ? null : "Insufficient inventory",
          },
        },
        tenantId,
        branchId,
      ),
    ]);
    return updated;
  },

  async setManualStockCount(
    tenantId: string,
    branchId: string | null | undefined,
    itemId: string,
    count: number | null,
    variantId?: string | null,
  ) {
    if (count !== null && (!Number.isInteger(count) || count < 0))
      throw new ValidationError(
        "Manual stock count must be a non-negative integer or null",
      );
    const updated = await availabilityRepository.setManualStockCount(
      tenantId,
      itemId,
      count,
      variantId,
    );
    if (!updated) throw itemNotFound(variantId ?? itemId);
    await eventBus.publish(
      {
        type: "menu.availability.updated",
        payload: {
          source: "MANUAL_STOCK_COUNT",
          entityType: updated.entityType,
          entityId: variantId ?? itemId,
          menuItemId: itemId,
          manualStockCount: count,
          ...(count === 0 ? { effectiveStatus: "OUT_OF_STOCK" as const } : {}),
        },
      },
      tenantId,
      branchId ?? undefined,
    );
    return updated;
  },
};
