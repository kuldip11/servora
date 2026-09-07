import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getItemRecipe: vi.fn(), setItemRecipe: vi.fn() }));
vi.mock("../recipes.service", () => ({ recipesService: mocks }));
import { recipesController } from "../recipes.controller";
describe("recipes controller coverage", () => {
  it("delegates get and set", async () => {
    const auth = { tenantId: "t1" } as any;
    mocks.getItemRecipe.mockResolvedValue([{ id: "r1" }]);
    mocks.setItemRecipe.mockResolvedValue([{ id: "r2" }]);
    await expect(recipesController.getItemRecipe(auth, "i1")).resolves.toMatchObject({ data: [{ id: "r1" }] });
    const ingredients = [{ inventoryItemId: "inv1", quantity: 1, unit: "GRAM" }] as any;
    await expect(recipesController.setItemRecipe(auth, "i1", ingredients)).resolves.toMatchObject({ data: [{ id: "r2" }] });
    expect(mocks.setItemRecipe).toHaveBeenCalledWith(auth, "i1", ingredients);
  });
});
