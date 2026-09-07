import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MenuItemCard } from "@/features/menu/components/MenuItemCard";

const item = {
  id: "m1",
  name: "Burger",
  description: "Tasty",
  foodType: "NON_VEG",
  basePrice: 150,
  prepTimeMinutes: 10,
  variants: [{ id: "v1" }],
  modifierGroupLinks: [],
} as any;

describe("MenuItemCard", () => {
  it("renders add and quantity states", () => {
    expect(
      renderToStaticMarkup(
        <MenuItemCard
          item={item}
          cartQty={2}
          singleCart={false}
          onTap={vi.fn()}
          onQtyChange={vi.fn()}
        />,
      ),
    ).toContain("Customisable");
    expect(
      renderToStaticMarkup(
        <MenuItemCard
          item={item}
          cartQty={2}
          singleCart={{ quantity: 2 } as any}
          onTap={vi.fn()}
          onQtyChange={vi.fn()}
        />,
      ),
    ).toContain("Decrease quantity");
  });
});
