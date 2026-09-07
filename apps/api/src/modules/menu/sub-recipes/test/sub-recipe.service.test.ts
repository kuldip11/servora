import { beforeEach, describe, expect, it, vi } from "vitest";
const { repo, record, syncMenu, syncConfig } = vi.hoisted(() => ({
  repo: {
    list: vi.fn(),
    findOwnedInventorySources: vi.fn(),
    findOwnedSubRecipeSources: vi.fn(),
    listGraph: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    findDirectRecipeReferences: vi.fn(),
    delete: vi.fn(),
  },
  record: vi.fn(),
  syncMenu: vi.fn(),
  syncConfig: vi.fn(),
}));
vi.mock("../sub-recipe.repository", () => ({ subRecipeRepository: repo }));
vi.mock("../../change-log/menu-change-log", () => ({
  menuChangeLog: { record },
  buildDiff: vi.fn(() => ({})),
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {
    syncMenuItemAvailability: syncMenu,
    syncRecipeConfigurationAvailability: syncConfig,
  },
}));
import { subRecipeService } from "../sub-recipe.service";
const auth = {
  tenantId: "t1",
  branchId: "b1",
  permissions: ["menu:read", "menu:update"],
} as any;
const raw = (overrides: any = {}) => ({
  inventoryItemId: "i1",
  quantity: 1,
  unit: "KG",
  ...overrides,
});
const nested = (overrides: any = {}) => ({
  ingredientSubRecipeId: "s2",
  quantity: 1,
  unit: "KG",
  ...overrides,
});
const base = (ingredients: any[] = [raw()]) => ({
  name: "Sauce",
  yieldQuantity: 1,
  yieldUnit: "KG",
  ingredients,
});
beforeEach(() => {
  vi.clearAllMocks();
  repo.list.mockResolvedValue([]);
  repo.findOwnedInventorySources.mockResolvedValue([{ id: "i1", unit: "KG" }]);
  repo.findOwnedSubRecipeSources.mockResolvedValue([
    { id: "s2", yieldUnit: "KG" },
  ]);
  repo.listGraph.mockResolvedValue([]);
  repo.findDirectRecipeReferences.mockResolvedValue([]);
  record.mockResolvedValue(undefined);
  syncMenu.mockResolvedValue(undefined);
  syncConfig.mockResolvedValue(undefined);
});
describe("sub-recipe service", () => {
  it("lists and validates create input failures", async () => {
    repo.list.mockResolvedValue([{ id: "s1" }]);
    await expect(subRecipeService.list(auth)).resolves.toEqual([{ id: "s1" }]);
    await expect(
      subRecipeService.create(auth, base([]) as any),
    ).rejects.toThrow(/at least one ingredient/i);
    await expect(
      subRecipeService.create(auth, base([{ quantity: 1, unit: "KG" }]) as any),
    ).rejects.toThrow(/exactly one/i);
    await expect(
      subRecipeService.create(auth, base([raw({ quantity: 0 })]) as any),
    ).rejects.toThrow(/greater than zero/i);
    await expect(
      subRecipeService.create(auth, { ...base(), name: " " } as any),
    ).rejects.toThrow(/name is required/i);
    await expect(
      subRecipeService.create(auth, { ...base(), yieldQuantity: 0 } as any),
    ).rejects.toThrow(/yield quantity/i);
    await expect(
      subRecipeService.create(auth, { ...base(), yieldPercent: 101 } as any),
    ).rejects.toThrow(/Yield percent/i);
  });
  it("validates ownership and unit compatibility", async () => {
    repo.findOwnedInventorySources.mockResolvedValueOnce([]);
    await expect(subRecipeService.create(auth, base() as any)).rejects.toThrow(
      /outside the active branch/i,
    );
    repo.findOwnedInventorySources.mockResolvedValueOnce([
      { id: "i1", unit: "LITERS" },
    ]);
    await expect(subRecipeService.create(auth, base() as any)).rejects.toThrow(
      /incompatible/i,
    );
    repo.findOwnedSubRecipeSources.mockResolvedValueOnce([]);
    await expect(
      subRecipeService.create(auth, base([nested()]) as any),
    ).rejects.toThrow(/component outside/i);
    repo.findOwnedSubRecipeSources.mockResolvedValueOnce([
      { id: "s2", yieldUnit: "LITERS" },
    ]);
    await expect(
      subRecipeService.create(auth, base([nested()]) as any),
    ).rejects.toThrow(/component yield unit/i);
  });
  it("creates and updates sub-recipes including not-found/self-reference cases", async () => {
    repo.create.mockResolvedValueOnce(undefined);
    await expect(subRecipeService.create(auth, base() as any)).rejects.toThrow(
      /Sub-recipe/i,
    );
    repo.create.mockResolvedValueOnce({ id: "s1" });
    await expect(subRecipeService.create(auth, base() as any)).resolves.toEqual(
      { id: "s1" },
    );
    expect(syncMenu).toHaveBeenCalled();
    repo.findById.mockResolvedValueOnce(undefined);
    await expect(
      subRecipeService.update(auth, "s1", base() as any),
    ).rejects.toThrow(/Sub-recipe/i);
    repo.findById.mockResolvedValueOnce({ id: "s1", branchId: "b2" });
    await expect(
      subRecipeService.update(auth, "s1", base() as any),
    ).rejects.toThrow(/Sub-recipe/i);
    repo.findById.mockResolvedValue({ id: "s1", branchId: "b1" });
    await expect(
      subRecipeService.update(
        auth,
        "s1",
        base([nested({ ingredientSubRecipeId: "s1" })]) as any,
      ),
    ).rejects.toThrow(/cannot include itself/i);
    repo.update.mockResolvedValueOnce(undefined);
    await expect(
      subRecipeService.update(auth, "s1", base() as any),
    ).rejects.toThrow(/Sub-recipe/i);
    repo.update.mockResolvedValueOnce({ id: "s1" });
    await expect(
      subRecipeService.update(auth, "s1", base() as any),
    ).resolves.toEqual({ id: "s1" });
  });
  it("rejects graphs deeper than the supported nesting limit", async () => {
    repo.listGraph.mockResolvedValueOnce([
      { id: "s2", children: ["s3"] },
      { id: "s3", children: ["s4"] },
      { id: "s4", children: [] },
    ]);
    await expect(
      subRecipeService.create(auth, base([nested()]) as any),
    ).rejects.toThrow(/nest at most 3 levels/i);
  });

  it("detects circular graphs and handles delete reference fan-out", async () => {
    repo.listGraph.mockResolvedValueOnce([
      { id: "s2", children: ["__new_sub_recipe__"] },
    ]);
    await expect(
      subRecipeService.create(auth, base([nested()]) as any),
    ).rejects.toThrow(/Circular/i);
    repo.findById.mockResolvedValueOnce(undefined);
    await expect(subRecipeService.delete(auth, "s1")).rejects.toThrow(
      /Sub-recipe/i,
    );
    repo.findById.mockResolvedValueOnce({ id: "s1", branchId: "b1" });
    repo.findDirectRecipeReferences.mockResolvedValueOnce([
      { menuItemId: "m1", variantId: "v1", modifierOptionId: null },
      { menuItemId: "m1", variantId: null, modifierOptionId: "o1" },
    ]);
    await expect(subRecipeService.delete(auth, "s1")).resolves.toBeUndefined();
    expect(syncConfig).toHaveBeenCalledWith("t1", "b1", "m1", ["v1"], ["o1"]);
    expect(syncMenu).toHaveBeenCalled();
  });
});
