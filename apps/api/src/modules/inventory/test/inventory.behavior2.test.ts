import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const c = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  updateStock: vi.fn(),
  lowStockAlerts: vi.fn(),
  recentTransactions: vi.fn(),
  getRecipeImpact: vi.fn(),
  listWasteReasons: vi.fn(),
  createWasteReason: vi.fn(),
  updateWasteReason: vi.fn(),
  logWaste: vi.fn(),
}));
vi.mock("../inventory.service", () => ({ inventoryService: c }));
import { inventoryController } from "../inventory.controller";

const now = new Date("2026-09-18T00:00:00.000Z");
const item = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "t1",
  branchId: "b1",
  name: "Milk",
  unit: "LITERS" as const,
  currentStock: "1.000",
  minimumStock: "1.000",
  reorderPoint: "1.000",
  costPerUnit: "1.00",
  isActive: true,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
};
const transaction = {
  id: "22222222-2222-4222-8222-222222222222",
  inventoryItemId: item.id,
  transactionType: "IN" as const,
  quantity: "1.000",
  balanceBefore: "0.000",
  balanceAfter: "1.000",
  notes: null,
  performedBy: "u1",
  wasteReasonId: null,
  reversalOfDeductionId: null,
  createdAt: now,
};
const wasteReason = {
  id: "33333333-3333-4333-8333-333333333333",
  tenantId: "t1",
  label: "Spoilage",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const auth = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@x",
  roles: [],
  permissions: [],
  authorizedBranchIds: ["b1"],
} as unknown as AuthContext;

describe("inventory controller remaining coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    c.list.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });
    c.create.mockResolvedValue(item);
    c.updateStock.mockResolvedValue({ item, transaction });
    c.lowStockAlerts.mockResolvedValue([]);
    c.recentTransactions.mockResolvedValue([]);
    c.getRecipeImpact.mockResolvedValue({ affected: [] });
    c.listWasteReasons.mockResolvedValue([]);
    c.createWasteReason.mockResolvedValue(wasteReason);
    c.updateWasteReason.mockResolvedValue(wasteReason);
    c.logWaste.mockResolvedValue({
      item,
      transaction: { ...transaction, transactionType: "WASTE" as const },
    });
  });
  it("covers every controller method and filtered pagination", async () => {
    await expect(
      inventoryController.list(auth, {
        page: 2,
        limit: 10,
        search: "milk",
        lowStockOnly: true,
      }),
    ).resolves.toMatchObject({
      success: true,
      pagination: { page: 2, limit: 10, total: 0 },
    });
    await expect(
      inventoryController.create(auth, {
        name: "Milk",
        unit: "LITERS",
        currentStock: 1,
        minimumStock: 1,
        reorderPoint: 1,
        costPerUnit: 1,
      }),
    ).resolves.toMatchObject({ success: true, data: { id: item.id } });
    await expect(
      inventoryController.updateStock(auth, "i", {
        quantity: 1,
        transactionType: "IN",
      }),
    ).resolves.toMatchObject({ success: true });
    await expect(
      inventoryController.lowStockAlerts(auth),
    ).resolves.toMatchObject({ success: true, data: [] });
    await expect(
      inventoryController.recentTransactions(auth),
    ).resolves.toMatchObject({ success: true, data: [] });
    await expect(
      inventoryController.recipeImpact(auth, "i"),
    ).resolves.toMatchObject({ success: true, data: { affected: [] } });
    await expect(
      inventoryController.listWasteReasons(auth, true),
    ).resolves.toMatchObject({ success: true });
    await expect(
      inventoryController.createWasteReason(auth, { label: "Spoilage" }),
    ).resolves.toMatchObject({ success: true, data: { id: wasteReason.id } });
    await expect(
      inventoryController.updateWasteReason(auth, "w", {
        label: "Waste",
        isActive: false,
      }),
    ).resolves.toMatchObject({ success: true });
    await expect(
      inventoryController.logWaste(auth, "i", {
        quantity: 1,
        wasteReasonId: "w",
        notes: "trim",
      }),
    ).resolves.toMatchObject({
      success: true,
      data: { item: { id: item.id } },
    });
  });
});
