import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";
const m = vi.hoisted(() => ({
  recipe: [] as any[],
  loading: false,
  inventory: [] as any[],
  subs: [] as any[],
  save: vi.fn(),
  err: vi.fn(),
}));
vi.mock("@/features/menu/hooks/useMenuItemRecipe", () => ({
  useMenuItemRecipe: () => ({ data: m.recipe, isLoading: m.loading }),
}));
vi.mock("@/features/inventory", () => ({
  useInventoryItems: () => ({ data: { items: m.inventory } }),
}));
vi.mock("@/features/menu/hooks/useSubRecipes", () => ({
  useSubRecipes: () => ({ data: m.subs }),
}));
vi.mock("@/features/menu/hooks/useSaveRecipe", () => ({
  useSaveRecipe: () => ({ isPending: false, mutate: m.save }),
}));
vi.mock("@/shared/lib/notify", () => ({ notifyError: m.err }));
import { RecipeBuilder } from "../RecipeBuilder";
const item: any = {
  id: "i1",
  name: "Burger",
  variants: [{ id: "v1", name: "Large" }],
  modifierGroupLinks: [
    { group: { name: "Extras", options: [{ id: "o1", name: "Cheese" }] } },
  ],
};
describe("RecipeBuilder coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.loading = false;
    m.inventory = [
      { id: "inv1", name: "Flour", unit: "GRAMS", currentStock: 2 },
      { id: "inv2", name: "Oil", unit: "ML", currentStock: 100 },
    ];
    m.subs = [
      { id: "s1", name: "Sauce", yieldUnit: "ML" },
      { id: "s2", name: "Dough", yieldUnit: "GRAMS" },
    ];
    m.recipe = [
      {
        inventoryItemId: "inv1",
        subRecipeId: null,
        variantId: null,
        modifierOptionId: null,
        quantityRequired: "3",
        unit: "GRAMS",
        yieldPercent: null,
        isOptional: false,
      },
    ];
    m.save.mockImplementation((_x: any, o: any) => o?.onSuccess?.());
  });
  it("loads recipe, edits scopes/sources and saves valid ingredients", async () => {
    render(<RecipeBuilder item={item} />);
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(document.querySelector(".text-warning")).toBeTruthy();
    chooseSelectOption("Source type for recipe row 1", "Sub-recipe");
    chooseSelectOption("Sub-recipe for recipe row 1", "Dough");
    fireEvent.change(screen.getByLabelText("Quantity for recipe row 1"), {
      target: { value: "2" },
    });
    chooseSelectOption("Scope for recipe row 1", "Variant");
    const yieldInput = screen.getByPlaceholderText("100");
    fireEvent.change(yieldInput, { target: { value: "80" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Save recipe"));
    await waitFor(() => expect(m.save).toHaveBeenCalled());
    expect(m.save.mock.calls[0]![0][0]).toEqual(
      expect.objectContaining({
        subRecipeId: "s2",
        inventoryItemId: null,
        variantId: "v1",
        quantity: 2,
        yieldPercent: 80,
        isOptional: true,
      }),
    );
  });
  it("adds inventory/sub-recipe rows, modifier scope and removes rows", () => {
    m.recipe = [];
    const { rerender } = render(<RecipeBuilder item={item} />);
    fireEvent.click(screen.getByText(/Add ingredient/));
    expect(screen.getByLabelText("Quantity for recipe row 1")).toBeTruthy();
    chooseSelectOption("Scope for recipe row 1", "Modifier");
    expect(screen.getByText(/Extras · Cheese/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Remove recipe row 1"));
    expect(screen.queryByLabelText("Quantity for recipe row 1")).toBeNull();
    m.inventory = [];
    rerender(<RecipeBuilder item={item} />);
    fireEvent.click(screen.getByText(/Add ingredient/));
    expect(
      screen.getByRole("combobox", { name: "Sub-recipe for recipe row 1" })
        .textContent,
    ).toContain("Sauce");
  });
  it("handles loading and no available ingredient sources", () => {
    m.loading = true;
    m.recipe = [];
    m.inventory = [];
    m.subs = [];
    const { rerender } = render(
      <RecipeBuilder
        item={{ ...item, variants: [], modifierGroupLinks: [] }}
      />,
    );
    expect(screen.getByText("Loading…")).toBeTruthy();
    m.loading = false;
    rerender(
      <RecipeBuilder
        item={{ ...item, variants: [], modifierGroupLinks: [] }}
      />,
    );
    fireEvent.click(screen.getByText(/Add ingredient/));
    expect(m.err).toHaveBeenCalledWith(
      undefined,
      "Add an inventory item or sub-recipe first",
    );
  });
  it("hydrates variant/modifier scopes and covers source, unit, variant, and modifier selectors", () => {
    m.recipe = [
      {
        inventoryItemId: "inv1",
        subRecipeId: null,
        variantId: "v1",
        modifierOptionId: null,
        quantityRequired: "1",
        unit: "GRAMS",
        yieldPercent: null,
        isOptional: false,
      },
      {
        inventoryItemId: "inv2",
        subRecipeId: null,
        variantId: null,
        modifierOptionId: "o1",
        quantityRequired: "1",
        unit: "ML",
        yieldPercent: null,
        isOptional: false,
      },
    ];
    render(<RecipeBuilder item={item} />);
    chooseSelectOption("Ingredient for recipe row 1", "Oil");
    chooseSelectOption("Unit for recipe row 1", "ml");
    chooseSelectOption("Scope for recipe row 1", "Variant");
    chooseSelectOption("Variant for recipe row 1", "Large");
    chooseSelectOption("Scope for recipe row 2", "Modifier");
    chooseSelectOption("Modifier option for recipe row 2", "Extras · Cheese");
    chooseSelectOption("Source type for recipe row 1", "Raw item");
    chooseSelectOption("Source type for recipe row 2", "Sub-recipe");
  });
});
