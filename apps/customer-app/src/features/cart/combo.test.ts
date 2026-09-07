import { describe, expect, it } from "vitest";
import type { CustomerCombo, CustomerMenuItem } from "@/features/menu/api";
import { comboLineKey, estimateComboLine } from "./combo";

const combo = (overrides: Partial<CustomerCombo> = {}): CustomerCombo => ({
  id: "combo-1",
  name: "Lunch",
  description: null,
  pricePolicy: "FIXED",
  fixedPrice: "10",
  percentOff: null,
  slots: [
    {
      id: "main",
      name: "Main",
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
      options: [
        { id: "burger", menuItemId: "item-1", variantId: null, upcharge: "1" },
        {
          id: "large",
          menuItemId: "item-1",
          variantId: "v-large",
          upcharge: "0.5",
        },
      ],
    },
  ],
  ...overrides,
});

const item = {
  id: "item-1",
  basePrice: "8",
  taxRate: "10",
  variants: [{ id: "v-large", price: "12" }],
} as unknown as CustomerMenuItem;

describe("customer combo pricing", () => {
  it("uses fixed combo price, selected variant price weights, upcharges, tax and quantity", () => {
    const result = estimateComboLine(
      {
        combo: combo(),
        quantity: 2,
        selections: [{ slotId: "main", optionIds: ["burger", "large"] }],
      },
      new Map([[item.id, item]]),
    );

    expect(result.subtotal).toBe(23);
    expect(result.tax).toBeCloseTo(2.3, 5);
    expect(result.total).toBeCloseTo(25.3, 5);
  });

  it("supports percent-off pricing and ignores stale option or item references", () => {
    const result = estimateComboLine(
      {
        combo: combo({
          pricePolicy: "PERCENT_OFF_SUM",
          fixedPrice: null,
          percentOff: "25",
        }),
        quantity: 1,
        selections: [
          { slotId: "main", optionIds: ["burger", "missing"] },
          { slotId: "unknown", optionIds: ["ghost"] },
        ],
      },
      new Map([[item.id, item]]),
    );

    expect(result.subtotal).toBe(7);
    expect(result.tax).toBeCloseTo(0.7, 5);
    expect(result.total).toBeCloseTo(7.7, 5);
  });

  it("handles zero-priced components without allocation errors", () => {
    const free = {
      ...item,
      basePrice: 0,
      taxRate: 5,
      variants: [],
    } as unknown as CustomerMenuItem;
    const result = estimateComboLine(
      {
        combo: combo({ fixedPrice: "1" }),
        quantity: 1,
        selections: [{ slotId: "main", optionIds: ["burger"] }],
      },
      new Map([[free.id, free]]),
    );
    expect(result.total).toBeCloseTo(2.1, 5);
  });

  it("builds a stable key regardless of selection ordering", () => {
    const a = comboLineKey({
      combo: combo(),
      quantity: 1,
      selections: [
        { slotId: "b", optionIds: ["2", "1"] },
        { slotId: "a", optionIds: ["4", "3"] },
      ],
    });
    const b = comboLineKey({
      combo: combo(),
      quantity: 9,
      selections: [
        { slotId: "a", optionIds: ["3", "4"] },
        { slotId: "b", optionIds: ["1", "2"] },
      ],
    });
    expect(a).toBe(b);
  });
});
