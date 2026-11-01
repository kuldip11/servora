import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createCategoryBody,
  updateCategoryBody,
  categoryIdParams,
} from "@/modules/menu/categories/category.validator";

describe("category.validator validators", () => {
  it("requires a category name for creation", () => {
    expect(Value.Check(createCategoryBody, {})).toBe(false);
    expect(Value.Check(createCategoryBody, { name: "Drinks" })).toBe(true);
    expect(Value.Check(updateCategoryBody, {})).toBe(false);
  });
  it("requires category id params", () => {
    expect(Value.Check(categoryIdParams, {})).toBe(false);
    expect(
      Value.Check(categoryIdParams, {
        id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(true);
  });
});
