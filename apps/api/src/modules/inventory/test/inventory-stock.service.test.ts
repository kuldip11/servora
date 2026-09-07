import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const m = vi.hoisted(() => ({
  findAllBranches: vi.fn(),
  findMany: vi.fn(),
  findBranch: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  findWasteReason: vi.fn(),
  applyStockChange: vi.fn(),
  findLowStock: vi.fn(),
  findLowStockAllBranches: vi.fn(),
  findRecentTransactions: vi.fn(),
  listWasteReasons: vi.fn(),
  createWasteReason: vi.fn(),
  updateWasteReason: vi.fn(),
  findOrderDeductions: vi.fn(),
  publish: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("../inventory.repository", () => ({
  inventoryRepository: {
    findAllBranches: m.findAllBranches,
    findMany: m.findMany,
    findBranch: m.findBranch,
    create: m.create,
    findById: m.findById,
    findWasteReason: m.findWasteReason,
    applyStockChange: m.applyStockChange,
    findLowStock: m.findLowStock,
    findLowStockAllBranches: m.findLowStockAllBranches,
    findRecentTransactions: m.findRecentTransactions,
    listWasteReasons: m.listWasteReasons,
    createWasteReason: m.createWasteReason,
    updateWasteReason: m.updateWasteReason,
    findOrderDeductions: m.findOrderDeductions,
  },
}));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: m.publish } }));
vi.mock("../inventory-recipe.service", () => ({
  inventoryRecipeService: { syncMenuItemAvailability: m.sync },
}));
import { inventoryStockService } from "../inventory-stock.service";
const auth = (o: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
    email: "u@x",
    branchId: "b1",
    tenantWide: false,
    authorizedBranchIds: ["b1"],
    permissions: [
      "inventory:read",
      "inventory:create",
      "inventory:update",
      "inventory:adjust",
      "inventory:waste",
    ],
    roles: [],
    requestId: "r",
    ipAddress: "127.0.0.1",
    ...o,
  }) as AuthContext;
const item = (o: Record<string, unknown> = {}) => ({
  id: "i1",
  tenantId: "t1",
  branchId: "b1",
  name: "Milk",
  currentStock: "5",
  minimumStock: "2",
  ...o,
});
describe("inventory stock service comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.findAllBranches.mockResolvedValue([item()]);
    m.findMany.mockResolvedValue([item()]);
    m.findBranch.mockResolvedValue({ id: "b1" });
    m.create.mockResolvedValue(item());
    m.findById.mockResolvedValue(item());
    m.findWasteReason.mockResolvedValue({ id: "w1", isActive: true });
    m.applyStockChange.mockResolvedValue({
      status: "ok",
      item: item(),
      transaction: { id: "tx1" },
    });
    m.findLowStock.mockResolvedValue([]);
    m.findLowStockAllBranches.mockResolvedValue([]);
    m.findRecentTransactions.mockResolvedValue([]);
    m.listWasteReasons.mockResolvedValue([]);
    m.createWasteReason.mockResolvedValue({ id: "w1" });
    m.updateWasteReason.mockResolvedValue({ id: "w1" });
    m.findOrderDeductions.mockResolvedValue([{ id: "d1" }]);
  });
  it("covers list filtering, search, low-stock only, pagination clamps and tenant-wide listing", async () => {
    m.findMany.mockResolvedValue([
      { ...item(), name: "Milk", currentStock: "1", minimumStock: "2" },
      {
        ...item({ id: "i2" }),
        name: "Bread",
        currentStock: "5",
        minimumStock: "2",
      },
    ] as any);
    await expect(
      inventoryStockService.list(auth(), {
        search: " milk ",
        lowStockOnly: true,
        page: 0,
        limit: 500,
      }),
    ).resolves.toMatchObject({
      total: 1,
      page: 1,
      limit: 100,
      items: [expect.objectContaining({ name: "Milk" })],
    });
    await expect(inventoryStockService.list(auth())).resolves.toMatchObject({
      page: 1,
      limit: 25,
    });
    await expect(
      inventoryStockService.list(auth({ tenantWide: true, branchId: null }), {
        page: 2,
        limit: 1,
      }),
    ).resolves.toMatchObject({ page: 2, limit: 1 });
  });
  it("covers create branch guard and low-stock publish/no-publish", async () => {
    m.findBranch.mockResolvedValueOnce(undefined);
    await expect(
      inventoryStockService.create(auth(), {
        name: "x",
        unit: "LITERS",
        currentStock: 1,
        minimumStock: 1,
        reorderPoint: 1,
        costPerUnit: 1,
      }),
    ).rejects.toThrow("Branch access denied");
    m.create.mockResolvedValueOnce(
      item({ currentStock: "1", minimumStock: "2" }),
    );
    await inventoryStockService.create(auth(), {
      name: "x",
      unit: "LITERS",
      currentStock: 1,
      minimumStock: 2,
      reorderPoint: 1,
      costPerUnit: 1,
    });
    expect(m.publish).toHaveBeenCalled();
    m.publish.mockClear();
    m.create.mockResolvedValueOnce(
      item({ currentStock: "3", minimumStock: "2" }),
    );
    await inventoryStockService.create(auth(), {
      name: "x",
      unit: "LITERS",
      currentStock: 3,
      minimumStock: 2,
      reorderPoint: 1,
      costPerUnit: 1,
    });
    expect(m.publish).not.toHaveBeenCalled();
  });
  it("covers update-stock missing item and all waste validations/outcomes", async () => {
    m.findById.mockResolvedValueOnce(undefined);
    await expect(
      inventoryStockService.updateStock(auth(), "x", {
        quantity: 1,
        transactionType: "IN",
      }),
    ).rejects.toThrow();
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 0,
        transactionType: "WASTE",
        wasteReasonId: "w1",
      }),
    ).rejects.toThrow("greater than zero");
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 1,
        transactionType: "WASTE",
      }),
    ).rejects.toThrow("waste reason is required");
    m.findWasteReason.mockResolvedValueOnce(undefined);
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 1,
        transactionType: "WASTE",
        wasteReasonId: "bad",
      }),
    ).rejects.toThrow("invalid or inactive");
    m.findWasteReason.mockResolvedValueOnce({ id: "w1", isActive: false });
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 1,
        transactionType: "WASTE",
        wasteReasonId: "w1",
      }),
    ).rejects.toThrow("invalid or inactive");
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 1,
        transactionType: "IN",
        wasteReasonId: "w1",
      } as any),
    ).rejects.toThrow("only valid for WASTE");
    m.applyStockChange.mockResolvedValueOnce({ status: "not_found" });
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 1,
        transactionType: "IN",
      }),
    ).rejects.toThrow();
    m.applyStockChange.mockResolvedValueOnce({ status: "insufficient_stock" });
    await expect(
      inventoryStockService.updateStock(auth(), "i1", {
        quantity: 1,
        transactionType: "OUT",
      }),
    ).rejects.toThrow("Insufficient stock");
  });
  it("covers successful stock changes with/without low-stock publish and waste attribution", async () => {
    m.applyStockChange.mockResolvedValueOnce({
      status: "ok",
      item: item({ currentStock: "1", minimumStock: "2" }),
      transaction: { id: "tx" },
    });
    await inventoryStockService.updateStock(auth(), "i1", {
      quantity: 1,
      transactionType: "IN",
    });
    expect(m.publish).toHaveBeenCalled();
    expect(m.sync).toHaveBeenCalledWith("t1", "b1", ["i1"]);
    m.publish.mockClear();
    m.applyStockChange.mockResolvedValueOnce({
      status: "ok",
      item: item({ currentStock: "5", minimumStock: "2" }),
      transaction: { id: "tx" },
    });
    await inventoryStockService.updateStock(auth(), "i1", {
      quantity: 1,
      transactionType: "WASTE",
      wasteReasonId: "w1",
      notes: "trim",
    });
    expect(m.publish).not.toHaveBeenCalled();
    expect(m.applyStockChange).toHaveBeenLastCalledWith(
      "t1",
      "i1",
      1,
      "WASTE",
      "u1",
      "trim",
      "w1",
    );
  });
  it("covers alerts, recent transactions and waste reason CRUD branches", async () => {
    await inventoryStockService.lowStockAlerts(auth());
    expect(m.findLowStock).toHaveBeenCalledWith("t1", "b1");
    await inventoryStockService.lowStockAlerts(
      auth({ tenantWide: true, branchId: null }),
    );
    expect(m.findLowStockAllBranches).toHaveBeenCalledWith("t1");
    await inventoryStockService.recentTransactions(auth(), 10);
    expect(m.findRecentTransactions).toHaveBeenCalledWith("t1", "b1", 10);
    await inventoryStockService.recentTransactions(
      auth({ tenantWide: true, branchId: null }),
      101,
    );
    expect(m.findRecentTransactions).toHaveBeenLastCalledWith("t1", null, 101);
    await inventoryStockService.listWasteReasons(auth(), true);
    expect(m.listWasteReasons).toHaveBeenCalledWith("t1", true);
    await expect(
      inventoryStockService.createWasteReason(auth(), "   "),
    ).rejects.toThrow("label is required");
    await inventoryStockService.createWasteReason(auth(), "  Spoilage  ");
    expect(m.createWasteReason).toHaveBeenCalledWith("t1", "Spoilage");
    m.findWasteReason.mockResolvedValueOnce(undefined);
    await expect(
      inventoryStockService.updateWasteReason(auth(), "x", {}),
    ).rejects.toThrow();
    m.findWasteReason.mockResolvedValueOnce({ id: "w1" });
    m.updateWasteReason.mockResolvedValueOnce(undefined);
    await expect(
      inventoryStockService.updateWasteReason(auth(), "w1", {}),
    ).rejects.toThrow();
    m.findWasteReason.mockResolvedValueOnce({ id: "w1" });
    m.updateWasteReason.mockResolvedValueOnce({ id: "w1" });
    await inventoryStockService.updateWasteReason(auth(), "w1", {
      label: "  X  ",
      isActive: false,
    });
    expect(m.updateWasteReason).toHaveBeenCalledWith("t1", "w1", {
      label: "X",
      isActive: false,
    });
    m.findWasteReason.mockResolvedValueOnce({ id: "w1" });
    await inventoryStockService.updateWasteReason(auth(), "w1", {});
    expect(m.updateWasteReason).toHaveBeenLastCalledWith("t1", "w1", {});
  });
  it("covers logWaste validation/note omission and order deductions", async () => {
    await expect(
      inventoryStockService.logWaste(auth(), "i1", {
        quantity: 0,
        wasteReasonId: "w1",
      }),
    ).rejects.toThrow("greater than zero");
    const spy = vi
      .spyOn(inventoryStockService, "updateStock")
      .mockResolvedValueOnce({
        item: item() as any,
        transaction: { id: "tx" } as any,
      });
    await inventoryStockService.logWaste(auth(), "i1", {
      quantity: 1,
      wasteReasonId: "w1",
    });
    expect(spy).toHaveBeenCalledWith(auth(), "i1", {
      quantity: 1,
      transactionType: "WASTE",
      wasteReasonId: "w1",
    });
    spy.mockResolvedValueOnce({
      item: item() as any,
      transaction: { id: "tx" } as any,
    });
    await inventoryStockService.logWaste(auth(), "i1", {
      quantity: 1,
      wasteReasonId: "w1",
      notes: "trim",
    });
    expect(spy).toHaveBeenLastCalledWith(auth(), "i1", {
      quantity: 1,
      transactionType: "WASTE",
      wasteReasonId: "w1",
      notes: "trim",
    });
    spy.mockRestore();
    await expect(
      inventoryStockService.getOrderDeductions("o1"),
    ).resolves.toEqual([{ id: "d1" }]);
  });
});
