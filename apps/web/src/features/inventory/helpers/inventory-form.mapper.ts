import type {
  CreateInventoryItemInput,
  UpdateInventoryStockInput,
} from "@pos/validation";
import type {
  InventoryItemFormInput,
  StockUpdateInput,
} from "@/features/inventory/services/inventory.service";

export const mapInventoryItemFormToRequest = (
  values: CreateInventoryItemInput,
): InventoryItemFormInput => ({
  name: values.name,
  unit: values.unit,
  currentStock: String(values.currentStock),
  minimumStock: String(values.minimumStock),
  reorderPoint: String(values.reorderPoint),
  costPerUnit: String(values.costPerUnit),
  ...(values.branchId ? { branchId: values.branchId } : {}),
});

export const mapStockUpdateFormToRequest = (
  values: UpdateInventoryStockInput,
): StockUpdateInput => ({
  ...values,
  quantity: String(values.quantity),
  notes: values.notes ?? "",
});
