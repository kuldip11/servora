import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, tx } = vi.hoisted(() => {
  const tx = {
    query: { subRecipes: { findFirst: vi.fn() } },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const db = {
    query: {
      subRecipes: { findMany: vi.fn(), findFirst: vi.fn() },
      inventoryItems: { findMany: vi.fn() },
      recipes: { findMany: vi.fn() },
    },
    transaction: vi.fn(async (fn: any) => fn(tx)),
    delete: vi.fn(),
  };
  return { db, tx };
});
vi.mock("@/db", () => ({ db }));
import { subRecipeRepository } from "../sub-recipe.repository";
const returning = (rows: any[]) => ({
  returning: vi.fn().mockResolvedValue(rows),
});
beforeEach(() => {
  vi.clearAllMocks();
  db.query.subRecipes.findMany.mockResolvedValue([]);
  db.query.subRecipes.findFirst.mockResolvedValue(undefined);
  db.query.inventoryItems.findMany.mockResolvedValue([]);
  db.query.recipes.findMany.mockResolvedValue([]);
  tx.query.subRecipes.findFirst.mockResolvedValue(undefined);
});
describe("sub-recipe repository", () => {
  it("covers reads, ownership short-circuits, graph mapping and references", async () => {
    db.query.subRecipes.findMany.mockResolvedValueOnce([{ id: "s1" }]);
    await expect(subRecipeRepository.list("t1", "b1")).resolves.toEqual([
      { id: "s1" },
    ]);
    db.query.subRecipes.findMany.mockResolvedValueOnce([{ id: "s2" }]);
    await expect(subRecipeRepository.list("t1", null)).resolves.toEqual([
      { id: "s2" },
    ]);
    db.query.subRecipes.findFirst.mockResolvedValueOnce({ id: "s1" });
    await expect(subRecipeRepository.findById("t1", "s1")).resolves.toEqual({
      id: "s1",
    });
    await expect(
      subRecipeRepository.findOwnedInventorySources("t1", "b1", []),
    ).resolves.toEqual([]);
    db.query.inventoryItems.findMany.mockResolvedValueOnce([{ id: "i1" }]);
    await expect(
      subRecipeRepository.findOwnedInventorySources("t1", "b1", ["i1"]),
    ).resolves.toEqual([{ id: "i1" }]);
    await expect(
      subRecipeRepository.findOwnedSubRecipeSources("t1", "b1", []),
    ).resolves.toEqual([]);
    db.query.subRecipes.findMany.mockResolvedValueOnce([{ id: "s1" }]);
    await expect(
      subRecipeRepository.findOwnedSubRecipeSources("t1", "b1", ["s1"]),
    ).resolves.toEqual([{ id: "s1" }]);
    db.query.subRecipes.findMany.mockResolvedValueOnce([
      {
        id: "s1",
        ingredients: [
          { ingredientSubRecipeId: "s2" },
          { ingredientSubRecipeId: null },
        ],
      },
    ]);
    await expect(subRecipeRepository.listGraph("t1")).resolves.toEqual([
      { id: "s1", children: ["s2"] },
    ]);
    db.query.recipes.findMany.mockResolvedValueOnce([
      { menuItemId: "m1", variantId: null, modifierOptionId: null },
    ]);
    await expect(
      subRecipeRepository.findDirectRecipeReferences("s1"),
    ).resolves.toHaveLength(1);
  });
  it("creates with and without ingredients and yield percent", async () => {
    tx.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue(returning([{ id: "s1" }])),
    });
    tx.query.subRecipes.findFirst.mockResolvedValueOnce({ id: "s1" });
    await expect(
      subRecipeRepository.create({
        tenantId: "t1",
        branchId: "b1",
        name: "Sauce",
        yieldQuantity: 1,
        yieldUnit: "KG",
        ingredients: [],
      }),
    ).resolves.toEqual({ id: "s1" });
    tx.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue(returning([{ id: "s2" }])),
      })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    tx.query.subRecipes.findFirst.mockResolvedValueOnce({ id: "s2" });
    await expect(
      subRecipeRepository.create({
        tenantId: "t1",
        branchId: "b1",
        name: "Sauce",
        yieldQuantity: 2,
        yieldUnit: "KG",
        yieldPercent: 80,
        ingredients: [{ inventoryItemId: "i1", quantity: 1.5, unit: "KG" }],
      }),
    ).resolves.toEqual({ id: "s2" });
  });
  it("updates with and without ingredients and deletes", async () => {
    tx.update.mockReturnValue({
      set: vi
        .fn()
        .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    tx.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    tx.query.subRecipes.findFirst.mockResolvedValueOnce({ id: "s1" });
    await expect(
      subRecipeRepository.update("s1", {
        branchId: "b1",
        name: "S",
        yieldQuantity: 1,
        yieldUnit: "KG",
        ingredients: [],
      }),
    ).resolves.toEqual({ id: "s1" });
    tx.query.subRecipes.findFirst.mockResolvedValueOnce({ id: "s1" });
    tx.insert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    });
    await expect(
      subRecipeRepository.update("s1", {
        branchId: "b1",
        name: "S",
        yieldQuantity: 1,
        yieldUnit: "KG",
        yieldPercent: 50,
        ingredients: [{ ingredientSubRecipeId: "s2", quantity: 1, unit: "KG" }],
      }),
    ).resolves.toEqual({ id: "s1" });
    db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    await expect(subRecipeRepository.delete("s1")).resolves.toBeUndefined();
  });
});
