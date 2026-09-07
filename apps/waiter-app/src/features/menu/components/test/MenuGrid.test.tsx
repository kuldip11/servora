import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MenuGrid } from "@/features/menu/components/MenuGrid";

const item = {
  id: "m1",
  name: "Burger",
  description: "Tasty",
  foodType: "NON_VEG",
  basePrice: 150,
  prepTimeMinutes: 10,
  variants: [],
  modifierGroupLinks: [],
} as any;

describe("MenuGrid", () => {
  it("renders loading and populated states", () => {
    expect(
      renderToStaticMarkup(
        <MenuGrid
          items={[]}
          cart={[]}
          isLoading
          menuSearch=""
          onItemTap={vi.fn()}
          onQtyChange={vi.fn()}
        />,
      ),
    ).toBeTruthy();
    expect(
      renderToStaticMarkup(
        <MenuGrid
          items={[item]}
          cart={[]}
          isLoading={false}
          menuSearch=""
          onItemTap={vi.fn()}
          onQtyChange={vi.fn()}
        />,
      ),
    ).toContain("Burger");
  });
});
