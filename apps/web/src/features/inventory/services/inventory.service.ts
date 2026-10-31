import {
  createInventoryApi,
  type InventoryItemDto,
  type InventoryRecipeImpactDto,
  type InventoryTransactionDto,
  type InventoryTransactionTypeDto,
  type InventoryUnitDto,
  type WasteReasonDto,
  InventoryListFilters,
  PaginatedResult,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

export interface InventoryItemFormInput {
  name: string;
  unit: InventoryUnitDto;
  currentStock: string;
  minimumStock: string;
  reorderPoint: string;
  costPerUnit: string;
  branchId?: string | undefined;
}

export interface StockUpdateInput {
  quantity: string;
  transactionType: InventoryTransactionTypeDto;
  notes: string;
  wasteReasonId?: string | undefined;
}

const inventoryApi = createInventoryApi(apiClient);

export const inventoryService = {
  list(
    filters: InventoryListFilters = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResult<InventoryItemDto>> {
    return inventoryApi.list(filters, signal);
  },
  lowStock(signal?: AbortSignal): Promise<InventoryItemDto[]> {
    return inventoryApi.lowStock(signal);
  },
  async add(input: InventoryItemFormInput): Promise<void> {
    await inventoryApi.create({
      name: input.name,
      unit: input.unit,
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
  ): Promise<InventoryRecipeImpactDto> {
    return inventoryApi.recipeImpact(itemId, signal);
  },
  transactions(signal?: AbortSignal): Promise<InventoryTransactionDto[]> {
    return inventoryApi.transactions(signal);
  },
  async updateStock(itemId: string, input: StockUpdateInput): Promise<void> {
    await inventoryApi.updateStock(itemId, {
      quantity: parseFloat(input.quantity),
      transactionType: input.transactionType,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.wasteReasonId ? { wasteReasonId: input.wasteReasonId } : {}),
    });
  },
  wasteReasons(signal?: AbortSignal): Promise<WasteReasonDto[]> {
    return inventoryApi.wasteReasons(signal);
  },
  createWasteReason(label: string): Promise<WasteReasonDto> {
    return inventoryApi.createWasteReason(label);
  },
  async logWaste(
    itemId: string,
    input: { quantity: number; wasteReasonId: string; notes?: string },
  ): Promise<void> {
    await inventoryApi.logWaste(itemId, input);
  },
};
