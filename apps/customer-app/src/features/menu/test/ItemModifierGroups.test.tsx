import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemModifierGroups } from "../ItemModifierGroups";
const option = (over: any = {}) => ({
  id: "o1",
  name: "Cheese",
  additionalPrice: "1",
  isAvailable: true,
  maxQuantity: 3,
  variantPrices: [],
  ...over,
});
const group = (over: any = {}) => ({
  id: "g1",
  name: "Extras",
  selectionType: "MULTIPLE",
  minSelections: 0,
  maxSelections: 3,
  options: [option()],
  dependsOnOptionId: null,
  ...over,
});
const item = (over: any = {}) =>
  ({
    id: "i1",
    name: "Pizza",
    supportsZones: false,
    displayMode: "STANDARD",
    modifierGroupLinks: [{ group: group() }],
    ...over,
  }) as any;
describe("ItemModifierGroups", () => {
  it("owns zone selection, guided/dependent groups and quantities", () => {
    const onZoneChange = vi.fn(),
      onToggle = vi.fn(),
      onOptionQuantity = vi.fn();
    render(
      <ItemModifierGroups
        item={item({
          supportsZones: true,
          displayMode: "GUIDED_BUILDER",
          modifierGroupLinks: [
            {
              group: group({
                minSelections: 1,
                options: [
                  option({
                    variantPrices: [{ variantId: "v", additionalPrice: "2" }],
                  }),
                ],
              }),
            },
            {
              group: group({
                id: "dep",
                name: "Dependent",
                dependsOnOptionId: "o1",
                options: [option({ id: "o2", name: "Sauce" })],
              }),
            },
            {
              group: group({
                id: "hidden",
                name: "Hidden",
                dependsOnOptionId: "missing",
              }),
            },
          ],
        })}
        selectedOptions={[{ optionId: "o1", quantity: 1, zoneLabel: "LEFT" }]}
        variantId="v"
        activeZone="LEFT"
        onZoneChange={onZoneChange}
        onToggle={onToggle}
        onOptionQuantity={onOptionQuantity}
      />,
    );
    expect(screen.getByText(/Build your dish/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Right half" }));
    expect(onZoneChange).toHaveBeenCalledWith("RIGHT");
    fireEvent.click(screen.getByText("Cheese"));
    expect(onToggle).toHaveBeenCalledWith("o1", "g1", "LEFT");
    fireEvent.click(screen.getByRole("button", { name: "Increase Cheese" }));
    expect(onOptionQuantity).toHaveBeenCalledWith("o1", 1, "LEFT");
    expect(screen.getByText(/Dependent/)).toBeTruthy();
    expect(screen.queryByText("Hidden")).toBeNull();
  });
});
