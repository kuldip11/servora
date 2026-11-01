import type { InventoryUnit } from "@pos/types";
import { eventBus } from "@/lib/event-bus";
import { inventoryRecipeAvailabilityService } from "./inventory-recipe-availability.service";
import { type ResolvedRawNeed } from "./inventory-recipe.engine";
import { resolveOrderItemRecipeNeeds } from "./inventory-recipe-resolver";
import { toRealtimeInventoryItem } from "./inventory-realtime";
import { inventoryRepository } from "./inventory.repository";
import type { InventoryOrderItemInput } from "./inventory.types";

export const inventoryRecipeDeductionService = {
  async deductForOrderItems(
    tenantId: string,
    branchId: string,
    orderId: string,
    kitchenTicketId: string,
    items: InventoryOrderItemInput[],
    performedBy: string | null,
  ): Promise<{
    deducted: number;
    short: Array<{ inventoryItemId: string; name: string }>;
  }> {
    const menuItemIds = items.map((item) => item.menuItemId);
    if (!menuItemIds.length) return { deducted: 0, short: [] };
    const recipeRows = await inventoryRepository.findRequiredRecipeLines(
      tenantId,
      branchId,
      menuItemIds,
    );
    if (!recipeRows.length) return { deducted: 0, short: [] };

    const lines: Array<{
      inventoryItemId: string;
      menuItemId: string;
      orderItemId: string;
      unit: InventoryUnit;
      neededQuantity: number;
    }> = [];

    for (const item of items) {
      const needs = await resolveOrderItemRecipeNeeds(
        tenantId,
        branchId,
        recipeRows,
        item,
      );
      const aggregated = new Map<string, ResolvedRawNeed>();
      for (const need of needs) {
        const existing = aggregated.get(need.inventoryItemId);
        if (existing) existing.neededQuantity += need.neededQuantity;
        else aggregated.set(need.inventoryItemId, { ...need });
      }
      for (const need of aggregated.values()) {
        lines.push({
          inventoryItemId: need.inventoryItemId,
          menuItemId: item.menuItemId,
          orderItemId: item.orderItemId,
          unit: need.unit,
          neededQuantity: need.neededQuantity,
        });
      }
    }
    if (!lines.length) return { deducted: 0, short: [] };

    const aggregated = new Map<string, (typeof lines)[number]>();
    for (const line of lines) {
      const key = `${line.orderItemId}:${line.inventoryItemId}`;
      const existing = aggregated.get(key);
      if (existing) existing.neededQuantity += line.neededQuantity;
      else aggregated.set(key, { ...line });
    }

    const { deducted, touchedInventoryItemIds, short } =
      await inventoryRepository.deductRecipeLines(
        tenantId,
        branchId,
        orderId,
        kitchenTicketId,
        Array.from(aggregated.values()),
        performedBy,
      );

    if (touchedInventoryItemIds.length) {
      await inventoryRecipeAvailabilityService.syncMenuItemAvailability(
        tenantId,
        branchId,
        touchedInventoryItemIds,
      );
      const touchedItems = await inventoryRepository.findByIds(
        tenantId,
        touchedInventoryItemIds,
      );
      for (const inventoryItem of touchedItems) {
        if (
          parseFloat(inventoryItem.currentStock) <=
          parseFloat(inventoryItem.minimumStock)
        ) {
          await eventBus.publish(
            {
              type: "inventory.low_stock",
              payload: toRealtimeInventoryItem(inventoryItem),
            },
            tenantId,
            branchId,
          );
        }
      }
    }
    return { deducted, short };
  },
};
