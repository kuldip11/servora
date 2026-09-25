import { createInventoryApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { InventoryListFilters, PaginatedResult } from "@pos/api-client";
import type {
  InventoryItem,
  InventoryRecipeImpact,
  InventoryTransaction,
  WasteReason,
} from "@pos/types";

export interface InventoryItemFormInput {
  name: string;
  unit: string;
  currentStock: string;
  minimumStock: string;
  reorderPoint: string;
  costPerUnit: string;
  branchId?: string | undefined;
}

export interface StockUpdateInput {
  quantity: string;
  transactionType: string;
  notes: string;
  wasteReasonId?: string | undefined;
}

const inventoryApi = createInventoryApi(apiClient);

export const inventoryService = {
  list(
    filters: InventoryListFilters = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResult<InventoryItem>> {
    return inventoryApi.list(filters, signal);
  },
  lowStock(signal?: AbortSignal): Promise<InventoryItem[]> {
    return inventoryApi.lowStock(signal);
  },
  async add(input: InventoryItemFormInput): Promise<void> {
    await inventoryApi.create({
      name: input.name,
      unit: input.unit as
        "KG" | "GRAMS" | "LITERS" | "ML" | "PIECES" | "PACKETS",
      currentStock: parseFloat(input.currentStock),
      minimumStock: parseFloat(input.minimumStock),
      reorderPoint: parseFloat(input.reorderPoint),
      costPerUnit: parseFloat(input.costPerUnit),
      ...(input.branchId ? { branchId: input.branchId } : {}),
    });
  },
  recipeImpact(
    itemId: string,
    signal?: AbortSignal,
  ): Promise<InventoryRecipeImpact> {
    return inventoryApi.recipeImpact(itemId, signal);
  },
  transactions(signal?: AbortSignal): Promise<InventoryTransaction[]> {
    return inventoryApi.transactions(signal);
  },
  async updateStock(itemId: string, input: StockUpdateInput): Promise<void> {
    await inventoryApi.updateStock(itemId, {
      quantity: parseFloat(input.quantity),
      transactionType: input.transactionType as
        "IN" | "OUT" | "ADJUSTMENT" | "WASTE",
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.wasteReasonId ? { wasteReasonId: input.wasteReasonId } : {}),
    });
  },
  wasteReasons(signal?: AbortSignal): Promise<WasteReason[]> {
    return inventoryApi.wasteReasons(signal);
  },
  createWasteReason(label: string): Promise<WasteReason> {
    return inventoryApi.createWasteReason(label);
  },
  logWaste(
    itemId: string,
    input: { quantity: number; wasteReasonId: string; notes?: string },
  ): Promise<void> {
    return inventoryApi.logWaste(itemId, input);
  },
};
