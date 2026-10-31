import type {
  CreateInventoryItemRequest,
  InventoryItemResponse,
} from "@pos/contracts";

export const toRealtimeInventoryItem = (item: {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  unit: CreateInventoryItemRequest["unit"];
  currentStock: string;
  minimumStock: string;
  reorderPoint: string;
  costPerUnit: string;
  isActive: boolean;
}): InventoryItemResponse => {
  return {
    id: item.id,
    tenantId: item.tenantId,
    branchId: item.branchId,
    name: item.name,
    unit: item.unit,
    currentStock: Number(item.currentStock),
    minimumStock: Number(item.minimumStock),
    reorderPoint: Number(item.reorderPoint),
    costPerUnit: Number(item.costPerUnit),
    isActive: item.isActive,
  };
};
