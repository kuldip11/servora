import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  inventoryItems,
  inventoryTransactions,
  recipes,
  menuItems,
  orderInventoryDeductions,
  branches,
  orders,
  kitchenTickets,
} = vi.hoisted(() => ({
  inventoryItems: {
    id: "id",
    tenantId: "tenantId",
    branchId: "branchId",
    isActive: "isActive",
    deletedAt: "deletedAt",
    name: "name",
    currentStock: "currentStock",
    minimumStock: "minimumStock",
    updatedAt: "updatedAt",
  },
  inventoryTransactions: { id: "id", inventoryItemId: "inventoryItemId" },
  recipes: {
    menuItemId: "menuItemId",
    inventoryItemId: "inventoryItemId",
    isOptional: "isOptional",
  },
  menuItems: {
    id: "id",
    branchId: "branchId",
    tenantId: "tenantId",
    status: "status",
    enableRecipeDeduction: "enableRecipeDeduction",
    deletedAt: "deletedAt",
  },
  orderInventoryDeductions: { orderId: "orderId" },
  branches: { id: "id", tenantId: "tenantId", isActive: "isActive" },
  orders: { id: "id", tenantId: "tenantId", branchId: "branchId" },
  kitchenTickets: {
    id: "id",
    orderId: "orderId",
    tenantId: "tenantId",
    branchId: "branchId",
  },
}));
vi.mock("../../../db/schema", () => ({
  inventoryItems,
  inventoryTransactions,
  recipes,
  menuItems,
  orderInventoryDeductions,
  branches,
  orders,
  kitchenTickets,
}));
const { inventoryFindFirst, branchFindFirst, findMany } = vi.hoisted(() => ({
  inventoryFindFirst: vi.fn(),
  branchFindFirst: vi.fn(),
  findMany: vi.fn(),
}));
const { db } = vi.hoisted(() => {
  const query = {
    inventoryItems: { findFirst: inventoryFindFirst, findMany },
    inventoryTransactions: { findMany },
    branches: { findFirst: branchFindFirst },
    orderInventoryDeductions: { findMany },
    recipes: { findMany },
    menuItems: { findMany },
  };
  const db = { query, transaction: vi.fn(), select: vi.fn() };
  return { query, db };
});
vi.mock("../../../db", () => ({ db }));
import { inventoryRepository } from "@/modules/inventory/inventory.repository";
beforeEach(() => {
  vi.clearAllMocks();
});
describe("inventory repository", () => {
  it("maps branch and item lookup queries through the DB boundary", async () => {
    branchFindFirst.mockResolvedValue({ id: "b1" });
    inventoryFindFirst.mockResolvedValue({ id: "i1", branchId: "b1" });
    await expect(inventoryRepository.findBranch("t1", "b1")).resolves.toEqual({
      id: "b1",
    });
    await expect(inventoryRepository.findById("t1", "i1")).resolves.toEqual({
      id: "i1",
      branchId: "b1",
    });
    expect(branchFindFirst).toHaveBeenCalledTimes(1);
    expect(inventoryFindFirst).toHaveBeenCalledTimes(1);
  });
  it("returns empty collections without constructing unnecessary DB queries", async () => {
    await expect(inventoryRepository.findByIds("t1", [])).resolves.toEqual([]);
    await expect(
      inventoryRepository.findRequiredRecipeLines("t1", "b1", []),
    ).resolves.toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
  it("filters low-stock results at the repository boundary", async () => {
    findMany.mockResolvedValue([
      { id: "i1", currentStock: "2", minimumStock: "3" },
      { id: "i2", currentStock: "5", minimumStock: "3" },
    ]);
    await expect(inventoryRepository.findLowStock("t1", "b1")).resolves.toEqual(
      [{ id: "i1", currentStock: "2", minimumStock: "3" }],
    );
  });
});
