import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));

import { menuItemsService } from "@/features/menu/services/menu-items.service";
import type { CreateMenuItemInput } from "@pos/api-client";

const payload: CreateMenuItemInput = {
  categoryId: "cat-1",
  name: "Paneer",
  basePrice: 250,
  taxRate: 5,
  foodType: "VEG",
  status: "ACTIVE",
  availabilityReason: null,
  enableRecipeDeduction: false,
  variants: [],
  modifierGroupIds: [],
  tagIds: [],
  allergenIds: [],
  imageUrls: [],
};

describe("menuItemsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles category CRUD through the expected endpoints", async () => {
    const category = { id: "cat-1", name: "Main" };
    api.get.mockResolvedValue({ data: { data: [category] } });
    api.post.mockResolvedValue({ data: { data: category } });
    api.patch.mockResolvedValue({ data: { data: category } });

    await expect(menuItemsService.listCategories()).resolves.toEqual([
      category,
    ]);
    await expect(menuItemsService.addCategory("Main")).resolves.toEqual(
      category,
    );
    await expect(
      menuItemsService.renameCategory("cat-1", "Updated"),
    ).resolves.toEqual(category);
    await menuItemsService.deleteCategory("cat-1");

    expect(api.get).toHaveBeenCalledWith("/menu/categories");
    expect(api.post).toHaveBeenCalledWith("/menu/categories", { name: "Main" });
    expect(api.patch).toHaveBeenCalledWith("/menu/categories/cat-1", {
      name: "Updated",
    });
    expect(api.delete).toHaveBeenCalledWith("/menu/categories/cat-1");
  });

  it("uses POST for new items and PATCH for existing items", async () => {
    const created = { id: "item-1", name: "Paneer" };
    api.post.mockResolvedValue({ data: { data: created } });
    api.patch.mockResolvedValue({ data: { data: created } });

    await menuItemsService.saveItem(null, payload);
    expect(api.post).toHaveBeenCalledWith("/menu/items", payload);

    await menuItemsService.saveItem({ id: "item-1" } as never, payload);
    const { categoryId: _categoryId, ...expectedUpdate } = payload;
    expect(api.patch).toHaveBeenCalledWith(
      "/menu/items/item-1",
      expectedUpdate,
    );
  });

  it("covers availability, deletion, duplication, and publish state", async () => {
    api.post.mockResolvedValue({ data: { data: { id: "item-2" } } });

    await menuItemsService.setManualAvailabilityOverride(
      "item-1",
      "OUT_OF_STOCK",
      "Chef 86",
    );
    await menuItemsService.clearManualAvailabilityOverride("item-1");
    await menuItemsService.deleteItem("item-1");
    await menuItemsService.duplicateItem("item-1");
    await menuItemsService.setPublished("item-1", true);
    await menuItemsService.setPublished("item-1", false);

    expect(api.put).toHaveBeenCalledWith("/menu/items/item-1/manual-override", {
      status: "OUT_OF_STOCK",
      reason: "Chef 86",
    });
    expect(api.delete).toHaveBeenCalledWith(
      "/menu/items/item-1/manual-override",
    );
    expect(api.delete).toHaveBeenCalledWith("/menu/items/item-1");
    expect(api.post).toHaveBeenCalledWith("/menu/items/item-1/duplicate");
    expect(api.patch).toHaveBeenLastCalledWith("/menu/items/item-1/unpublish");
  });

  it("sends the bulk operation payloads unchanged", async () => {
    api.post.mockResolvedValue({
      data: { data: { updated: 2, deleted: 2, protected: 0 } },
    });

    await menuItemsService.bulkSetStatus(["i1"], "ACTIVE" as never, "restock");
    await menuItemsService.bulkMoveCategory(["i1"], "cat-2");
    await menuItemsService.bulkUpdateTags(["i1"], ["t1"], "replace");
    await menuItemsService.bulkAdjustPrice(["i1"], 10, "increase");
    await menuItemsService.bulkDelete(["i1"]);

    expect(api.post).toHaveBeenNthCalledWith(1, "/menu/items/bulk/status", {
      itemIds: ["i1"],
      status: "ACTIVE",
      reason: "restock",
    });
    expect(api.post).toHaveBeenNthCalledWith(2, "/menu/items/bulk/category", {
      itemIds: ["i1"],
      categoryId: "cat-2",
    });
    expect(api.post).toHaveBeenNthCalledWith(3, "/menu/items/bulk/tags", {
      itemIds: ["i1"],
      tagIds: ["t1"],
      mode: "replace",
    });
    expect(api.post).toHaveBeenNthCalledWith(4, "/menu/items/bulk/price", {
      itemIds: ["i1"],
      priceChange: 10,
      mode: "increase",
    });
    expect(api.post).toHaveBeenNthCalledWith(5, "/menu/items/bulk/delete", {
      itemIds: ["i1"],
    });
  });
});
