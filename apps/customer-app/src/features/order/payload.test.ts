import { describe, expect, it } from "vitest";
import { createOrderPayload } from "./payload";
import type { CartLine } from "@/features/cart";

const item = {
  id: "item-1",
  categoryId: "main",
  name: "Burger",
  description: null,
  basePrice: "100",
  taxRate: "5",
  imageUrl: null,
  foodType: "NON_VEG" as const,
  spiceLevel: "NONE" as const,
  prepTimeMinutes: 10,
  variants: [],
  modifierGroupLinks: [],
  tagLinks: [],
  images: [],
};

describe("createOrderPayload", () => {
  it("maps cart lines without sending undefined optional fields", () => {
    const cart: CartLine[] = [
      {
        item,
        quantity: 2,
        selectedOptions: [],
        fulfillmentType: "DINE_IN",
      },
    ];

    expect(createOrderPayload(cart, "DINE_IN")).toEqual({
      fulfillmentType: "DINE_IN",
      items: [
        { menuItemId: "item-1", quantity: 2, fulfillmentType: "DINE_IN" },
      ],
    });
  });

  it("normalizes selected options deterministically", () => {
    const cart: CartLine[] = [
      {
        item,
        quantity: 1,
        variantId: "large",
        selectedOptions: [
          { optionId: "z", quantity: 1 },
          { optionId: "a", quantity: 2 },
        ],
        fulfillmentType: "DINE_IN",
      },
    ];

    expect(createOrderPayload(cart, "TAKEAWAY")).toEqual({
      fulfillmentType: "TAKEAWAY",
      items: [
        {
          menuItemId: "item-1",
          quantity: 1,
          variantId: "large",
          selectedOptions: [
            { optionId: "a", quantity: 2 },
            { optionId: "z", quantity: 1 },
          ],
          fulfillmentType: "TAKEAWAY",
        },
      ],
    });
  });
});
