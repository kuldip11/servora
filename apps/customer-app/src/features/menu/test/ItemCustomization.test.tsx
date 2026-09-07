import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemCustomization } from "../ItemCustomization";
const option = () => ({
  id: "o1",
  name: "Cheese",
  additionalPrice: "1",
  isAvailable: true,
  maxQuantity: 3,
  variantPrices: [],
});
const group = () => ({
  id: "g1",
  name: "Extras",
  selectionType: "MULTIPLE",
  minSelections: 1,
  maxSelections: 3,
  options: [option()],
  dependsOnOptionId: null,
});
const item = (over: any = {}) =>
  ({
    id: "i1",
    name: "Pizza",
    description: "Good",
    basePrice: "10",
    pricingMode: "FIXED",
    weightUnit: null,
    imageUrl: null,
    images: [],
    foodType: "VEG",
    spiceLevel: "MILD",
    variants: [],
    modifierGroupLinks: [{ group: group() }],
    supportsZones: false,
    displayMode: "STANDARD",
    ...over,
  }) as any;
describe("ItemCustomization", () => {
  it("composes overview, modifier groups and footer", () => {
    render(
      <ItemCustomization
        item={item()}
        selectedOptions={[{ optionId: "o1", quantity: 1 }]}
        onVariantChange={vi.fn()}
        onToggle={vi.fn()}
        onOptionQuantity={vi.fn()}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        quantity={1}
        onQuantityChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Pizza")).toBeTruthy();
    expect(screen.getByText("Extras")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add to order/ })).toBeTruthy();
  });
  it("keeps configuration validation at the orchestrator boundary", () => {
    render(
      <ItemCustomization
        item={item({
          variants: [{ id: "v", name: "V", price: "10", status: "ACTIVE" }],
        })}
        selectedOptions={[]}
        onVariantChange={vi.fn()}
        onToggle={vi.fn()}
        onOptionQuantity={vi.fn()}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        quantity={1}
        onQuantityChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: /Add to order/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
