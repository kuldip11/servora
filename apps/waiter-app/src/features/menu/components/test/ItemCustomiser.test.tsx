import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  BottomSheet: ({ children, footer, title }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
      {footer}
    </section>
  ),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  TextInput: ({ label: _label, ...props }: any) => <input {...props} />,
}));

import { ItemCustomiser } from "@/features/menu/components/ItemCustomiser";

const cart = [
  {
    menuItemId: "m1",
    name: "Burger",
    basePrice: 100,
    modifiers: [{ groupId: "g1", optionId: "o1", name: "Cheese", quantity: 2 }],
    chefNotes: "Hot",
    course: 1,
    quantity: 2,
    unitPrice: 120,
    variantId: "v1",
    variantName: "Large",
  },
] as any;
const item = {
  id: "m1",
  name: "Burger",
  basePrice: "100",
  description: "Tasty",
  variants: [{ id: "v1", name: "Large", price: "120" }],
  modifierGroupLinks: [
    {
      group: {
        id: "g1",
        name: "Extras",
        selectionType: "MULTIPLE",
        minSelections: 0,
        maxSelections: 2,
        options: [
          {
            id: "o1",
            name: "Cheese",
            additionalPrice: "10",
            maxQuantity: 2,
            isAvailable: true,
          },
        ],
      },
    },
  ],
  tags: ["Popular"],
  allergens: ["Milk"],
} as any;

describe("ItemCustomiser", () => {
  it("renders variants and modifiers", () => {
    const html = renderToStaticMarkup(
      <ItemCustomiser item={item} onConfirm={vi.fn()} onClose={vi.fn()} />,
    );
    expect(html).toContain("Large");
    expect(html).toContain("Extras");
    expect(html).toContain("Cheese");
  });
  it("restores a configured cart line for editing", () => {
    const html = renderToStaticMarkup(
      <ItemCustomiser
        item={item}
        existingCartItem={cart[0]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain("Update Item");
    expect(html).toContain("Large");
    expect(html).toContain("Hot");
  });
  it("renders guided builder items as a step flow", () => {
    const guidedItem = {
      ...item,
      displayMode: "GUIDED_BUILDER",
      modifierGroupLinks: [
        { group: { ...item.modifierGroupLinks[0].group, minSelections: 1 } },
        {
          group: {
            id: "g2",
            name: "Sauce",
            selectionType: "SINGLE",
            minSelections: 1,
            maxSelections: 1,
            options: [
              {
                id: "o2",
                name: "Mint",
                additionalPrice: "0",
                maxQuantity: 1,
                isAvailable: true,
              },
            ],
          },
        },
      ],
    };
    const html = renderToStaticMarkup(
      <ItemCustomiser
        item={guidedItem}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain("Build your dish");
    expect(html).toContain("Step 1 of 2");
    expect(html).toContain("Extras");
    expect(html).not.toContain("Sauce");
    expect(html).toContain("Next step");
  });
});
