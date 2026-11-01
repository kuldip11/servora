import { describe, expect, it, vi } from "vitest";

const { list, create, updateStock, lowStockAlerts, recentTransactions } =
  vi.hoisted(() => ({
    list: vi.fn(),
    create: vi.fn(),
    updateStock: vi.fn(),
    lowStockAlerts: vi.fn(),
    recentTransactions: vi.fn(),
  }));

vi.mock("../inventory.service", () => ({
  inventoryService: {
    list,
    create,
    updateStock,
    lowStockAlerts,
    recentTransactions,
  },
}));

import { inventoryController } from "@/modules/inventory/inventory.controller";

const itemId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";
const branchId = "33333333-3333-4333-8333-333333333333";
const txId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const now = new Date("2026-09-18T00:00:00.000Z");

const auth = {
  userId,
  tenantId,
  branchId,
  email: "u@example.com",
  roles: [],
  permissions: [],
} as any;

const item = {
  id: itemId,
  tenantId,
  branchId,
  name: "Flour",
  unit: "KG" as const,
  currentStock: "10.000",
  minimumStock: "2.000",
  reorderPoint: "3.000",
  costPerUnit: "4.00",
  isActive: true,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
};

const transaction = {
  id: txId,
  inventoryItemId: itemId,
  transactionType: "IN" as const,
  quantity: "2.000",
  balanceBefore: "8.000",
  balanceAfter: "10.000",
  notes: null,
  performedBy: userId,
  wasteReasonId: null,
  reversalOfDeductionId: null,
  createdAt: now,
};

describe("inventory controller", () => {
  it("delegates list and wraps a success response", async () => {
    list.mockResolvedValue({ items: [item], total: 1, page: 1, limit: 25 });
    await expect(inventoryController.list(auth)).resolves.toEqual({
      success: true,
      data: [expect.objectContaining({ id: itemId, currentStock: 10 })],
      pagination: { page: 1, limit: 25, total: 1, hasMore: false },
    });
    expect(list).toHaveBeenCalledWith(auth, {});
  });

  it("delegates create with a created response", async () => {
    const input = {
      name: "Flour",
      unit: "KG",
      currentStock: 1,
      minimumStock: 2,
      reorderPoint: 3,
      costPerUnit: 4,
    };
    create.mockResolvedValue(item);
    await expect(
      inventoryController.create(auth, input as any),
    ).resolves.toEqual({
      success: true,
      data: expect.objectContaining({ id: itemId, costPerUnit: 4 }),
    });
    expect(create).toHaveBeenCalledWith(auth, input);
  });

  it("delegates stock updates and low-stock alerts", async () => {
    updateStock.mockResolvedValue({ item, transaction });
    lowStockAlerts.mockResolvedValue([item]);
    await expect(
      inventoryController.updateStock(auth, itemId, {
        quantity: 2,
        transactionType: "IN",
      } as any),
    ).resolves.toEqual({
      success: true,
      data: {
        item: expect.objectContaining({ id: itemId }),
        transaction: expect.objectContaining({ id: txId, quantity: 2 }),
      },
    });
    await expect(inventoryController.lowStockAlerts(auth)).resolves.toEqual({
      success: true,
      data: [expect.objectContaining({ id: itemId })],
    });
  });
});
