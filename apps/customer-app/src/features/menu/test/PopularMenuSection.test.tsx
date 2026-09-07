import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("../MenuCard", () => ({
  MenuCard: ({ item, onSelect }: any) => (
    <button onClick={() => onSelect(item)}>card:{item.name}</button>
  ),
}));
import { PopularMenuSection } from "../components/PopularMenuSection";
const item = (id: string, over: any = {}) =>
  ({
    id,
    name: `Dish ${id}`,
    description: null,
    basePrice: "10",
    pricingMode: "STANDARD",
    weightUnit: null,
    imageUrl: null,
    images: [],
    categoryId: "c1",
    tagLinks: [],
    ...over,
  }) as any;
const combo = (over: any = {}) =>
  ({
    id: "co",
    name: "Combo",
    description: null,
    slots: [{ id: "s" }],
    ...over,
  }) as any;
describe("PopularMenuSection", () => {
  it("owns featured item, combo and remaining-card interactions", () => {
    const onOpenItem = vi.fn(),
      onOpenCombo = vi.fn();
    render(
      <PopularMenuSection
        items={[
          item("1", { imageUrl: "x.jpg", description: "nice" }),
          item("2"),
        ]}
        combos={[
          combo(),
          combo({
            id: "co2",
            name: "Described",
            description: "hello",
            slots: [],
          }),
        ]}
        onOpenItem={onOpenItem}
        onOpenCombo={onOpenCombo}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Dish 1/ }));
    expect(onOpenItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Combo/ }));
    expect(onOpenCombo).toHaveBeenCalled();
    fireEvent.click(screen.getByText("card:Dish 2"));
    expect(onOpenItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2" }),
    );
    expect(screen.getByText("1 guided choices")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
  });
  it("owns open and weight-based featured pricing", () => {
    const { rerender } = render(
      <PopularMenuSection
        items={[item("o", { pricingMode: "OPEN" })]}
        combos={[]}
        onOpenItem={vi.fn()}
        onOpenCombo={vi.fn()}
      />,
    );
    expect(screen.getByText("Staff priced")).toBeTruthy();
    rerender(
      <PopularMenuSection
        items={[item("w", { pricingMode: "WEIGHT_BASED", weightUnit: null })]}
        combos={[]}
        onOpenItem={vi.fn()}
        onOpenCombo={vi.fn()}
      />,
    );
    expect(screen.getByText(/unit/)).toBeTruthy();
  });
});
