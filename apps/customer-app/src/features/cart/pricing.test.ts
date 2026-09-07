import { describe, expect, it } from "vitest";
import {
  getCartLineKey,
  getCartSubtotal,
  getCartSummary,
  getCartTax,
  getCartTotal,
  getLineSubtotal,
  getItemCount,
} from "./pricing";
import type { CustomerMenuItem } from "@/api";
import type { CartLine } from "./pricing";

const item: CustomerMenuItem = {
  id: "burger",
  categoryId: "main",
  name: "Burger",
  description: "",
  basePrice: "100",
  taxRate: "5",
  imageUrl: null,
  foodType: "NON_VEG",
  spiceLevel: "NONE",
  prepTimeMinutes: 10,
  variants: [{ id: "large", name: "Large", price: "120" }],
  modifierGroupLinks: [
    {
      sortOrder: 0,
      group: {
        id: "extras",
        name: "Extras",
        selectionType: "MULTIPLE",
        minSelections: 0,
        maxSelections: 3,
        options: [
          {
            id: "cheese",
            name: "Cheese",
            additionalPrice: "20",
            isAvailable: true,
            maxQuantity: 2,
          },
        ],
      },
    },
  ],
  tagLinks: [],
  images: [],
};

describe("cart pricing", () => {
  it("includes variants and modifiers in the line subtotal", () => {
    const line: CartLine = {
      item,
      quantity: 2,
      variantId: "large",
      selectedOptions: [{ optionId: "cheese", quantity: 1 }],
      fulfillmentType: "DINE_IN",
    };
    expect(getLineSubtotal(line)).toBe(280);
  });

  it("calculates tax from the complete configured line price", () => {
    const line: CartLine = {
      item,
      quantity: 2,
      variantId: "large",
      selectedOptions: [{ optionId: "cheese", quantity: 1 }],
      fulfillmentType: "DINE_IN",
    };
    expect(getCartSubtotal([line])).toBe(280);
    expect(getCartTax([line])).toBe(14);
    expect(getCartTotal([line])).toBe(294);
  });

  it("creates stable keys independent of option order", () => {
    const first = {
      item,
      variantId: "large",
      selectedOptions: [
        { optionId: "cheese", quantity: 1 },
        { optionId: "sauce", quantity: 1 },
      ],
      fulfillmentType: "DINE_IN",
    } satisfies Pick<
      CartLine,
      "item" | "variantId" | "selectedOptions" | "fulfillmentType"
    >;
    const second = {
      item,
      variantId: "large",
      selectedOptions: [
        { optionId: "sauce", quantity: 1 },
        { optionId: "cheese", quantity: 1 },
      ],
      fulfillmentType: "DINE_IN",
    } satisfies Pick<
      CartLine,
      "item" | "variantId" | "selectedOptions" | "fulfillmentType"
    >;
    expect(getCartLineKey(first)).toBe(getCartLineKey(second));
  });
});

describe("getCartSummary", () => {
  it("derives subtotal, tax, total inputs, and item count in one summary", () => {
    const line = {
      item: {
        id: "item-1",
        categoryId: "main",
        name: "Test item",
        description: null,
        basePrice: "100",
        taxRate: "5",
        imageUrl: null,
        foodType: "VEG" as const,
        spiceLevel: null,
        prepTimeMinutes: 10,
        variants: [{ id: "large", name: "Large", price: "120" }],
        modifierGroupLinks: [
          {
            sortOrder: 0,
            group: {
              id: "extras",
              name: "Extras",
              selectionType: "MULTIPLE" as const,
              minSelections: 0,
              maxSelections: 2,
              options: [
                {
                  id: "cheese",
                  name: "Cheese",
                  additionalPrice: "20",
                  isAvailable: true,
                  maxQuantity: 2,
                },
              ],
            },
          },
        ],
        tagLinks: [],
        images: [],
      },
      quantity: 2,
      variantId: "large",
      selectedOptions: [{ optionId: "cheese", quantity: 1 }],
      fulfillmentType: "DINE_IN",
    } satisfies CartLine;

    expect(getCartSummary([line])).toEqual({
      subtotal: 280,
      tax: 14,
      total: 294,
      itemCount: 2,
    });
  });
});

describe("pricing branch coverage", () => {
  const zonedItem = {
    ...item,
    supportsZones: true,
    zonePricingRule: "HIGHER" as const,
    modifierGroupLinks: [
      {
        sortOrder: 0,
        group: {
          id: "extras",
          name: "Extras",
          selectionType: "MULTIPLE" as const,
          minSelections: 0,
          maxSelections: 4,
          options: [
            {
              id: "cheese",
              name: "Cheese",
              additionalPrice: "20",
              isAvailable: true,
              maxQuantity: 3,
              variantPrices: [{ variantId: "large", additionalPrice: "25" }],
            },
            { id: "sauce", name: "Sauce", additionalPrice: "10", isAvailable: true, maxQuantity: 3 },
          ],
        },
      },
    ],
  } satisfies CustomerMenuItem;

  it("covers whole, left/right, scoped variant and HIGHER zone pricing", () => {
    const line: CartLine = {
      item: zonedItem,
      quantity: 1,
      variantId: "large",
      selectedOptions: [
        { optionId: "cheese", quantity: 1 },
        { optionId: "cheese", quantity: 1, zoneLabel: "LEFT" },
        { optionId: "sauce", quantity: 2, zoneLabel: "RIGHT" },
      ],
      fulfillmentType: "DINE_IN",
    };
    expect(getLineSubtotal(line)).toBe(170);
  });

  it("covers AVERAGE, HALF_SUM, unsupported-zone and empty-zone fallbacks", () => {
    const base: CartLine = {
      item: { ...zonedItem, zonePricingRule: "AVERAGE" },
      quantity: 1,
      selectedOptions: [
        { optionId: "cheese", quantity: 1, zoneLabel: "LEFT" },
        { optionId: "sauce", quantity: 1, zoneLabel: "RIGHT" },
      ],
      fulfillmentType: "DINE_IN",
    };
    expect(getLineSubtotal(base)).toBe(115);
    expect(getLineSubtotal({ ...base, item: { ...zonedItem, zonePricingRule: "HALF_SUM" as any } })).toBe(115);
    expect(getLineSubtotal({ ...base, item: { ...zonedItem, supportsZones: false } })).toBe(130);
    expect(getLineSubtotal({ ...base, selectedOptions: [] })).toBe(100);
  });

  it("handles missing options, invalid taxes, summary helpers, item count and default line key fields", () => {
    const line: CartLine = {
      item: { ...item, taxRate: "not-a-number" },
      quantity: 3,
      selectedOptions: [{ optionId: "missing", quantity: 2, zoneLabel: "WHOLE" }],
      fulfillmentType: "TAKEAWAY",
    };
    expect(getCartSummary([line])).toEqual({ subtotal: 300, tax: 0, total: 300, itemCount: 3 });
    expect(getItemCount([line])).toBe(3);
    const key = getCartLineKey({ item, selectedOptions: [{ optionId: "x", quantity: 1 }], fulfillmentType: "DINE_IN" });
    expect(key).toContain('"variantId":null');
  });
});
