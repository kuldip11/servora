import { describe, expect, it } from "vitest";
import {
  aggregateRawNeeds,
  canSatisfyNeeds,
  recipeYieldFactor,
  weightRecipeScale,
} from "@/modules/inventory/inventory-recipe.engine";

describe("inventory recipe engine", () => {
  it("normalizes weight-priced recipe quantities to kilograms", () => {
    expect(weightRecipeScale(500, "G")).toBe(0.5);
    expect(weightRecipeScale(2, "KG")).toBe(2);
  });

  it("normalizes recipe yield percentages", () => {
    expect(recipeYieldFactor("80")).toBe(0.8);
    expect(recipeYieldFactor(null)).toBe(1);
  });

  it("aggregates repeated raw inventory needs before stock checks", () => {
    const needs = [
      {
        inventoryItemId: "flour",
        name: "Flour",
        currentStock: 3,
        unit: "KG" as const,
        neededQuantity: 1.25,
        costPerUnit: 2,
      },
      {
        inventoryItemId: "flour",
        name: "Flour",
        currentStock: 3,
        unit: "KG" as const,
        neededQuantity: 1.5,
        costPerUnit: 2,
      },
    ];
    expect(aggregateRawNeeds(needs)[0]?.neededQuantity).toBe(2.75);
    expect(canSatisfyNeeds(needs)).toBe(true);
    expect(
      canSatisfyNeeds([...needs, { ...needs[0]!, neededQuantity: 1 }]),
    ).toBe(false);
  });
});

import {
  applicableRecipeRows,
  convertRecipeQuantity,
} from "@/modules/inventory/inventory-recipe.engine";

describe("inventory recipe engine comprehensive branches", () => {
  it("covers all weight units and invalid weight/yield fallbacks", () => {
    expect(weightRecipeScale(undefined, "KG")).toBe(1);
    expect(weightRecipeScale(1, null)).toBe(1);
    expect(weightRecipeScale("bad", "KG")).toBe(1);
    expect(weightRecipeScale(0, "KG")).toBe(1);
    expect(weightRecipeScale(2, "LB")).toBeCloseTo(0.90718474);
    expect(weightRecipeScale(2, "OZ")).toBeCloseTo(0.05669904625);
    expect(recipeYieldFactor(undefined)).toBe(1);
    expect(recipeYieldFactor("bad")).toBe(1);
    expect(recipeYieldFactor("0")).toBe(1);
  });

  it("selects base, variant and modifier recipes with override/multipliers", () => {
    const baseRow = (o: Record<string, unknown> = {}) =>
      ({
        menuItemId: "m1",
        inventoryItemId: "i1",
        subRecipeId: null,
        variantId: null,
        modifierOptionId: null,
        menuItem: { enableRecipeDeduction: true },
        ...o,
      }) as any;
    const rows = [
      baseRow(),
      baseRow({
        inventoryItemId: "i2",
        menuItem: { enableRecipeDeduction: false },
      }),
      baseRow({ inventoryItemId: "i1", variantId: "v1" }),
      baseRow({ inventoryItemId: null, subRecipeId: "s1", variantId: "v1" }),
      baseRow({ inventoryItemId: "i3", modifierOptionId: "op1" }),
      baseRow({ inventoryItemId: "i4", modifierOptionId: "op2" }),
      baseRow({ menuItemId: "other", inventoryItemId: "x" }),
    ];
    const selected = applicableRecipeRows(rows, {
      menuItemId: "m1",
      variantId: "v1",
      selectedOptions: [
        { optionId: "op1" },
        { optionId: "op1", quantity: 2 },
        { optionId: "op2", quantity: 0 },
      ],
    });
    expect(selected.some((x: any) => x.row.variantId === "v1")).toBe(true);
    expect(
      selected.find((x: any) => x.row.modifierOptionId === "op1")?.multiplier,
    ).toBe(3);
    expect(selected.some((x: any) => x.row.modifierOptionId === "op2")).toBe(
      false,
    );
    expect(
      applicableRecipeRows(rows, { menuItemId: "m1" }, false).length,
    ).toBeGreaterThan(1);
  });

  it("converts compatible recipe quantities and rejects incompatible units", () => {
    expect(convertRecipeQuantity(500, "GRAMS", "KG", "Flour")).toBe(0.5);
    expect(() => convertRecipeQuantity(1, "KG", "ML", "Flour")).toThrow(
      "Flour uses incompatible units",
    );
  });
});
