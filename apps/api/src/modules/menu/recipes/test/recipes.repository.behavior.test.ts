import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  itemFindFirst: vi.fn(), recipeFindMany: vi.fn(), inventoryFindMany: vi.fn(), subFindMany: vi.fn(), variantFindFirst: vi.fn(),
  select: vi.fn(), from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn(), transaction: vi.fn(),
  txDelete: vi.fn(), txDeleteWhere: vi.fn(), txInsert: vi.fn(), txValues: vi.fn(), txRecipeFindMany: vi.fn(),
}));
vi.mock("@/db", () => {
  m.select.mockImplementation(() => ({ from: m.from }));
  m.from.mockImplementation(() => ({ innerJoin: m.innerJoin }));
  m.innerJoin.mockImplementation(() => ({ where: m.where }));
  m.where.mockImplementation(() => ({ limit: m.limit }));
  m.txDelete.mockImplementation(() => ({ where: m.txDeleteWhere }));
  m.txInsert.mockImplementation(() => ({ values: m.txValues }));
  const tx = { delete: m.txDelete, insert: m.txInsert, query: { recipes: { findMany: m.txRecipeFindMany } } };
  m.transaction.mockImplementation(async (fn: (value: any) => unknown) => fn(tx));
  return { db: { query: { menuItems: { findFirst: m.itemFindFirst }, recipes: { findMany: m.recipeFindMany }, inventoryItems: { findMany: m.inventoryFindMany }, subRecipes: { findMany: m.subFindMany }, menuItemVariants: { findFirst: m.variantFindFirst } }, select: m.select, transaction: m.transaction } };
});
import { recipesRepository } from "../recipes.repository";

beforeEach(() => { vi.clearAllMocks(); m.txDeleteWhere.mockResolvedValue(undefined); m.txValues.mockResolvedValue(undefined); m.txRecipeFindMany.mockResolvedValue([]); });

describe("recipes repository comprehensive coverage", () => {
  it("reads item, recipe, inventory, sub-recipe and variant sources", async () => {
    m.itemFindFirst.mockResolvedValue({ id: "i1" }); m.recipeFindMany.mockResolvedValue([{ id: "r1" }]); m.inventoryFindMany.mockResolvedValue([{ id: "inv1" }]); m.subFindMany.mockResolvedValue([{ id: "sub1" }]); m.variantFindFirst.mockResolvedValue({ id: "v1" });
    await expect(recipesRepository.findItem("t1", "i1")).resolves.toEqual({ id: "i1" });
    await expect(recipesRepository.getItemRecipe("i1")).resolves.toEqual([{ id: "r1" }]);
    await expect(recipesRepository.findOwnedInventorySources("t1", [])).resolves.toEqual([]);
    await expect(recipesRepository.findOwnedInventorySources("t1", ["inv1"])).resolves.toEqual([{ id: "inv1" }]);
    await expect(recipesRepository.findOwnedSubRecipeSources("t1", [])).resolves.toEqual([]);
    await expect(recipesRepository.findOwnedSubRecipeSources("t1", ["sub1"])).resolves.toEqual([{ id: "sub1" }]);
    await expect(recipesRepository.findVariantForItem("i1", "v1")).resolves.toEqual({ id: "v1" });
  });

  it("finds attached modifier options and returns null when absent", async () => {
    m.limit.mockResolvedValueOnce([{ id: "o1" }]).mockResolvedValueOnce([]);
    await expect(recipesRepository.findModifierOptionForItem("i1", "o1")).resolves.toEqual({ id: "o1" });
    await expect(recipesRepository.findModifierOptionForItem("i1", "missing")).resolves.toBeNull();
  });

  it("replaces recipes with normalized optional fields and supports clearing", async () => {
    m.txRecipeFindMany.mockResolvedValueOnce([{ id: "r1" }]);
    const out = await recipesRepository.replaceRecipe("i1", [{ inventoryItemId: "inv1", quantity: 2, unit: "GRAMS", yieldPercent: 80, isOptional: true }, { subRecipeId: "sub1", variantId: "v1", modifierOptionId: null, quantity: 1, unit: "GRAMS" }]);
    expect(out).toEqual([{ id: "r1" }]);
    expect(m.txValues).toHaveBeenCalledWith([
      expect.objectContaining({ menuItemId: "i1", inventoryItemId: "inv1", subRecipeId: null, variantId: null, modifierOptionId: null, quantityRequired: "2", yieldPercent: "80", isOptional: true }),
      expect.objectContaining({ subRecipeId: "sub1", variantId: "v1", quantityRequired: "1", yieldPercent: null, isOptional: false }),
    ]);
    vi.clearAllMocks(); m.txDeleteWhere.mockResolvedValue(undefined); m.txRecipeFindMany.mockResolvedValue([]);
    await expect(recipesRepository.replaceRecipe("i1", [])).resolves.toEqual([]);
    expect(m.txInsert).not.toHaveBeenCalled();
  });
});
