import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));

import { menuRecipesService } from "@/features/menu/services/menu-recipes.service";

describe("menuRecipesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { data: [] } });
  });

  it("loads recipes for an item", async () => {
    const recipes = [{ id: "r1" }];
    api.get.mockResolvedValue({ data: { data: recipes } });
    await expect(menuRecipesService.get("item-1")).resolves.toEqual(recipes);
    expect(api.get).toHaveBeenCalledWith("/menu/items/item-1/recipes");
  });

  it("posts the complete ingredient list when saving", async () => {
    const ingredients = [
      {
        inventoryItemId: "inv-1",
        quantity: 2,
        unit: "KG" as never,
        isOptional: false,
      },
    ];
    await menuRecipesService.save("item-1", ingredients);
    expect(api.post).toHaveBeenCalledWith("/menu/items/item-1/recipes", {
      ingredients,
    });
  });
});
