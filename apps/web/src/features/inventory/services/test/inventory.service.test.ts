import { describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));
import { inventoryService } from "@/features/inventory/services/inventory.service";

describe("inventoryService", () => {
  it("lists inventory", async () => {
    api.get.mockResolvedValue({
      data: {
        data: ["i"],
        pagination: { page: 1, limit: 25, total: 1, hasMore: false },
      },
    });
    await expect(inventoryService.list()).resolves.toEqual({
      items: ["i"],
      pagination: { page: 1, limit: 25, total: 1, hasMore: false },
    });
  });
  it("loads recipe impact for an inventory item", async () => {
    const impact = {
      inventoryItemId: "i1",
      inventoryItemName: "Flour",
      impacts: [],
    };
    api.get.mockResolvedValue({ data: { data: impact } });
    await expect(inventoryService.recipeImpact("i1")).resolves.toEqual(impact);
    expect(api.get).toHaveBeenCalledWith("/inventory/items/i1/recipe-impact");
  });
  it("normalizes numeric fields when adding", async () => {
    api.post.mockResolvedValue({ data: { data: { id: "i1" } } });
    await inventoryService.add({
      name: "Rice",
      unit: "KG",
      currentStock: "12.5",
      minimumStock: "2",
      reorderPoint: "4.5",
      costPerUnit: "30",
      branchId: "",
    });
    expect(api.post).toHaveBeenCalledWith("/inventory/items", {
      name: "Rice",
      unit: "KG",
      currentStock: 12.5,
      minimumStock: 2,
      reorderPoint: 4.5,
      costPerUnit: 30,
    });
  });
  it("updates stock with parsed quantity and optional notes", async () => {
    api.patch.mockResolvedValue({
      data: { data: { item: {}, transaction: {} } },
    });
    await inventoryService.updateStock("i1", {
      quantity: "3.5",
      transactionType: "IN",
      notes: "",
    });
    expect(api.patch).toHaveBeenCalledWith("/inventory/items/i1/stock", {
      quantity: 3.5,
      transactionType: "IN",
    });
  });
});
