import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { subRecipeBody, subRecipeParams } from "../sub-recipe.validator";
describe("sub-recipe validators", () => {
  it("validates bodies and params", () => {
    expect(Value.Check(subRecipeBody, { name: "Sauce", yieldQuantity: 1, yieldUnit: "LITERS", ingredients: [] })).toBe(true);
    expect(Value.Check(subRecipeBody, { name: "", yieldQuantity: 1, yieldUnit: "LITERS", ingredients: [] })).toBe(false);
    expect(Value.Check(subRecipeBody, { name: "Sauce", yieldQuantity: 0, yieldUnit: "LITERS", ingredients: [] })).toBe(false);
    expect(Value.Check(subRecipeParams, {})).toBe(false);
  });
});
