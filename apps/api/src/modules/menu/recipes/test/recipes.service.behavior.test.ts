import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  findItem: vi.fn(),
  getItemRecipe: vi.fn(),
  findOwnedInventorySources: vi.fn(),
  findOwnedSubRecipeSources: vi.fn(),
  findVariantForItem: vi.fn(),
  findModifierOptionForItem: vi.fn(),
  replaceRecipe: vi.fn(),
  requirePermission: vi.fn(),
  assertMenuResourceBranch: vi.fn(),
  record: vi.fn(),
  unitsCompatible: vi.fn(),
  syncRecipeConfigurationAvailability: vi.fn(),
}));
vi.mock("../recipes.repository", () => ({
  recipesRepository: {
    findItem: m.findItem,
    getItemRecipe: m.getItemRecipe,
    findOwnedInventorySources: m.findOwnedInventorySources,
    findOwnedSubRecipeSources: m.findOwnedSubRecipeSources,
    findVariantForItem: m.findVariantForItem,
    findModifierOptionForItem: m.findModifierOptionForItem,
    replaceRecipe: m.replaceRecipe,
  },
}));
vi.mock("@/core/auth", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/modules/menu/menu-authorization", () => ({
  assertMenuResourceBranch: m.assertMenuResourceBranch,
}));
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({
  menuChangeLog: { record: m.record },
}));
vi.mock("@/modules/inventory/inventory-units", () => ({
  areInventoryUnitsCompatible: m.unitsCompatible,
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {
    syncRecipeConfigurationAvailability: m.syncRecipeConfigurationAvailability,
  },
}));
import { recipesService } from "../recipes.service";

const auth = {
  tenantId: "t1",
  userId: "u1",
  branchId: "b1",
  permissions: ["menu:read", "menu:update"],
} as any;
const inv = (o: Record<string, unknown> = {}) =>
  ({ inventoryItemId: "inv1", quantity: 1, unit: "GRAM", ...o }) as any;
const sub = (o: Record<string, unknown> = {}) =>
  ({ subRecipeId: "sub1", quantity: 1, unit: "GRAM", ...o }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  m.findItem.mockResolvedValue({ id: "i1", branchId: "b1" });
  m.getItemRecipe.mockResolvedValue([]);
  m.findOwnedInventorySources.mockResolvedValue([
    { id: "inv1", branchId: "b1", unit: "GRAM" },
  ]);
  m.findOwnedSubRecipeSources.mockResolvedValue([
    { id: "sub1", branchId: "b1", yieldUnit: "GRAM" },
  ]);
  m.findVariantForItem.mockResolvedValue({ id: "v1" });
  m.findModifierOptionForItem.mockResolvedValue({ id: "o1" });
  m.replaceRecipe.mockResolvedValue([{ id: "r1" }]);
  m.unitsCompatible.mockReturnValue(true);
  m.record.mockResolvedValue(undefined);
  m.syncRecipeConfigurationAvailability.mockResolvedValue(undefined);
});

describe("recipes service comprehensive coverage", () => {
  it("gets recipe and guards missing items", async () => {
    await expect(recipesService.getItemRecipe(auth, "i1")).resolves.toEqual([]);
    expect(m.requirePermission).toHaveBeenCalledWith(auth, "menu:read");
    m.findItem.mockResolvedValueOnce(undefined);
    await expect(
      recipesService.getItemRecipe(auth, "missing"),
    ).rejects.toThrow();
  });

  it("sets a valid branch recipe, normalizes fields, records change, and syncs prior scoped configuration", async () => {
    m.getItemRecipe.mockResolvedValueOnce([
      { variantId: "v-old", modifierOptionId: null },
      { variantId: null, modifierOptionId: "o-old" },
    ]);
    const rows = [
      inv({ variantId: "v1", yieldPercent: 90, isOptional: true }),
      sub({ modifierOptionId: "o1" }),
    ];
    await expect(
      recipesService.setItemRecipe(auth, "i1", rows),
    ).resolves.toEqual([{ id: "r1" }]);
    expect(m.replaceRecipe).toHaveBeenCalledWith("i1", [
      expect.objectContaining({
        inventoryItemId: "inv1",
        subRecipeId: null,
        variantId: "v1",
        modifierOptionId: null,
        yieldPercent: 90,
        isOptional: true,
      }),
      expect.objectContaining({
        inventoryItemId: null,
        subRecipeId: "sub1",
        variantId: null,
        modifierOptionId: "o1",
        yieldPercent: null,
        isOptional: false,
      }),
    ]);
    expect(m.syncRecipeConfigurationAvailability).toHaveBeenCalledWith(
      "t1",
      "b1",
      "i1",
      ["v-old"],
      ["o-old"],
    );
  });

  it("skips inventory sync for shared items", async () => {
    m.findItem.mockResolvedValue({ id: "i1", branchId: null });
    m.findOwnedInventorySources.mockResolvedValue([
      { id: "inv1", branchId: null, unit: "GRAM" },
    ]);
    await recipesService.setItemRecipe(auth, "i1", [inv()]);
    expect(m.syncRecipeConfigurationAvailability).not.toHaveBeenCalled();
  });

  it.each([
    ["no source", { quantity: 1, unit: "GRAM" }, "exactly one"],
    [
      "two sources",
      {
        inventoryItemId: "inv1",
        subRecipeId: "sub1",
        quantity: 1,
        unit: "GRAM",
      },
      "exactly one",
    ],
    [
      "two scopes",
      inv({ variantId: "v1", modifierOptionId: "o1" }),
      "variant or a modifier",
    ],
    ["zero yield", inv({ yieldPercent: 0 }), "yield percent"],
    ["high yield", inv({ yieldPercent: 101 }), "yield percent"],
  ])("rejects %s", async (_label, row, msg) => {
    await expect(
      recipesService.setItemRecipe(auth, "i1", [row as any]),
    ).rejects.toThrow(msg);
  });

  it("rejects duplicate recipe sources within the same scope", async () => {
    await expect(
      recipesService.setItemRecipe(auth, "i1", [inv(), inv()]),
    ).rejects.toThrow("Duplicate recipe source");
    await expect(
      recipesService.setItemRecipe(auth, "i1", [
        sub({ variantId: "v1" }),
        sub({ variantId: "v1" }),
      ]),
    ).rejects.toThrow("Duplicate recipe source");
  });

  it("rejects unknown variant and modifier scopes", async () => {
    m.findVariantForItem.mockResolvedValueOnce(undefined);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [inv({ variantId: "bad" })]),
    ).rejects.toThrow("variant does not belong");
    m.findModifierOptionForItem.mockResolvedValueOnce(undefined);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [
        inv({ modifierOptionId: "bad" }),
      ]),
    ).rejects.toThrow("modifier option is not attached");
  });

  it("rejects missing inventory and sub-recipe sources", async () => {
    m.findOwnedInventorySources.mockResolvedValueOnce([]);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [inv()]),
    ).rejects.toThrow("Inventory item");
    m.findOwnedSubRecipeSources.mockResolvedValueOnce([]);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [sub()]),
    ).rejects.toThrow("Sub-recipe not found");
  });

  it("rejects incompatible units and cross-branch inventory", async () => {
    m.unitsCompatible.mockReturnValueOnce(false);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [inv({ unit: "ML" })]),
    ).rejects.toThrow("incompatible with inventory unit");
    m.findOwnedInventorySources.mockResolvedValueOnce([
      { id: "inv1", branchId: "b2", unit: "GRAM" },
    ]);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [inv()]),
    ).rejects.toThrow("different branch");
  });

  it("rejects sub-recipes on shared items, cross-branch sub-recipes, and incompatible sub-recipe units", async () => {
    m.findItem.mockResolvedValueOnce({ id: "i1", branchId: null });
    await expect(
      recipesService.setItemRecipe(auth, "i1", [sub()]),
    ).rejects.toThrow("shared menu item");
    m.findOwnedSubRecipeSources.mockResolvedValueOnce([
      { id: "sub1", branchId: "b2", yieldUnit: "GRAM" },
    ]);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [sub()]),
    ).rejects.toThrow("different branch");
    m.unitsCompatible.mockReturnValueOnce(false);
    await expect(
      recipesService.setItemRecipe(auth, "i1", [sub({ unit: "ML" })]),
    ).rejects.toThrow("sub-recipe yield unit");
  });

  it("rejects missing items before writes", async () => {
    m.findItem.mockResolvedValueOnce(undefined);
    await expect(
      recipesService.setItemRecipe(auth, "missing", []),
    ).rejects.toThrow();
    expect(m.replaceRecipe).not.toHaveBeenCalled();
  });
});
