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
    c.create.mockResolvedValue({ id: "i" });
    c.updateStock.mockResolvedValue({ ok: true });
    c.lowStockAlerts.mockResolvedValue([]);
    c.recentTransactions.mockResolvedValue([]);
    c.getRecipeImpact.mockResolvedValue({ affected: [] });
    c.listWasteReasons.mockResolvedValue([]);
    c.createWasteReason.mockResolvedValue({ id: "w" });
    c.updateWasteReason.mockResolvedValue({ id: "w" });
    c.logWaste.mockResolvedValue({ id: "tx" });
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
    ).resolves.toMatchObject({ success: true, data: { id: "i" } });
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
    ).resolves.toMatchObject({ success: true, data: { id: "w" } });
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
    ).resolves.toMatchObject({ success: true, data: { id: "tx" } });
  });
});
