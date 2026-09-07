import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemCustomizationOverview } from "../ItemCustomizationOverview";
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
    ...over,
  }) as any;
describe("ItemCustomizationOverview", () => {
  it("owns item identity, food badges and variant selection", () => {
    const onVariantChange = vi.fn();
    render(
      <ItemCustomizationOverview
        item={item({
          imageUrl: "x.jpg",
          foodType: "EGG",
          variants: [
            { id: "v1", name: "Large", price: "12", status: "ACTIVE" },
            {
              id: "v2",
              name: "Off",
              price: "9",
              manualOverrideStatus: "INACTIVE",
            },
          ],
        })}
        onVariantChange={onVariantChange}
      />,
    );
    expect(screen.getByText("Pizza")).toBeTruthy();
    expect(screen.getByText("Contains egg")).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]!);
    expect(onVariantChange).toHaveBeenCalledWith("v1");
    expect((radios[1] as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole("img")).toBeTruthy();
  });
  it("owns open and weight-based staff pricing copy", () => {
    const { rerender } = render(
      <ItemCustomizationOverview
        item={item({
          pricingMode: "WEIGHT_BASED",
          weightUnit: "KG",
          foodType: "NON_VEG",
          spiceLevel: "NONE",
        })}
        onVariantChange={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/kg/).length).toBeGreaterThan(0);
    expect(screen.getByText("Non-vegetarian")).toBeTruthy();
    rerender(
      <ItemCustomizationOverview
        item={item({ pricingMode: "OPEN" })}
        onVariantChange={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Staff priced").length).toBeGreaterThan(0);
  });
});
