import type {
  InventoryItemResponse,
  InventoryTransactionResponse,
  WasteReasonResponse,
} from "@pos/contracts";
import {
  inventoryItems,
  inventoryTransactions,
  wasteReasons,
} from "@/db/schema";

export type InventoryItemRecord = typeof inventoryItems.$inferSelect & {
  branch?: { id: string; name: string } | null;
};

type WasteReasonRecord = typeof wasteReasons.$inferSelect;

type InventoryTransactionRecord = typeof inventoryTransactions.$inferSelect & {
  inventoryItem: InventoryItemRecord;
  performedByUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  wasteReason?: WasteReasonRecord | null;
};

const numberFromDecimal = (value: string | number): number => Number(value);

export const toInventoryItemResponse = (
  item: InventoryItemRecord,
): InventoryItemResponse => ({
  id: item.id,
  tenantId: item.tenantId,
  branchId: item.branchId,
  ...(item.branch
    ? { branch: { id: item.branch.id, name: item.branch.name } }
    : {}),
  name: item.name,
  unit: item.unit,
  currentStock: numberFromDecimal(item.currentStock),
  minimumStock: numberFromDecimal(item.minimumStock),
  reorderPoint: numberFromDecimal(item.reorderPoint),
  costPerUnit: numberFromDecimal(item.costPerUnit),
  isActive: item.isActive,
});

export const toWasteReasonResponse = (
  reason: WasteReasonRecord,
): WasteReasonResponse => ({
  id: reason.id,
  tenantId: reason.tenantId,
  label: reason.label,
  isActive: reason.isActive,
  createdAt: reason.createdAt.toISOString(),
  updatedAt: reason.updatedAt.toISOString(),
});

export const toInventoryTransactionResponse = (
  transaction: InventoryTransactionRecord,
): InventoryTransactionResponse => ({
  id: transaction.id,
  inventoryItemId: transaction.inventoryItemId,
  transactionType: transaction.transactionType,
  quantity: numberFromDecimal(transaction.quantity),
  balanceBefore: numberFromDecimal(transaction.balanceBefore),
  balanceAfter: numberFromDecimal(transaction.balanceAfter),
  notes: transaction.notes,
  performedBy: transaction.performedBy,
  reversalOfDeductionId: transaction.reversalOfDeductionId,
  wasteReasonId: transaction.wasteReasonId,
  wasteReason: transaction.wasteReason
    ? toWasteReasonResponse(transaction.wasteReason)
    : null,
  createdAt: transaction.createdAt.toISOString(),
  inventoryItem: toInventoryItemResponse(transaction.inventoryItem),
  performedByUser: transaction.performedByUser
    ? {
        id: transaction.performedByUser.id,
        firstName: transaction.performedByUser.firstName ?? null,
        lastName: transaction.performedByUser.lastName ?? null,
      }
    : null,
});
