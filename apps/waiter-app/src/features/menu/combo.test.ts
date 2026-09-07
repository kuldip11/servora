import { describe, expect, it } from "vitest";
import {
  comboLineKey,
  estimateComboSubtotal,
  type WaiterCombo,
  type WaiterComboCartLine,
  type WaiterComboMenuItem,
} from "./combo";

const combo = (overrides: Partial<WaiterCombo> = {}): WaiterCombo => ({
  id: "combo-1",
  name: "Meal",
  description: null,
  pricePolicy: "FIXED",
  fixedPrice: "10",
  percentOff: null,
  status: "ACTIVE",
  slots: [
    {
      id: "main",
      name: "Main",
      minSelections: 1,
      maxSelections: 2,
      sortOrder: 0,
      options: [
        { id: "base", menuItemId: "item-1", variantId: null, upcharge: "1" },
        { id: "large", menuItemId: "item-1", variantId: "v1", upcharge: "0.5" },
      ],
    },
  ],
  ...overrides,
});

const item: WaiterComboMenuItem = {
  id: "item-1",
  name: "Burger",
  basePrice: "8",
  variants: [{ id: "v1", name: "Large", price: "12" }],
};

const line = (
  overrides: Partial<WaiterComboCartLine> = {},
): WaiterComboCartLine => ({
  combo: combo(),
  quantity: 2,
  selections: [{ slotId: "main", optionIds: ["base", "large"] }],
  ...overrides,
});

describe("waiter combo helpers", () => {
  it("prices fixed combos with upcharges and quantity", () => {
    expect(estimateComboSubtotal(line(), new Map([[item.id, item]]))).toBe(23);
  });

  it("prices percent-off combos using base and variant prices", () => {
    const value = estimateComboSubtotal(
      line({
        combo: combo({
          pricePolicy: "PERCENT_OFF_SUM",
          fixedPrice: null,
          percentOff: "25",
        }),
        quantity: 1,
      }),
      new Map([[item.id, item]]),
    );
    expect(value).toBe(16.5);
  });

  it("ignores stale option/item references and tolerates missing variants", () => {
    const noVariants: WaiterComboMenuItem = {
      id: "item-1",
      name: "Burger",
      basePrice: 8,
    };
    const value = estimateComboSubtotal(
      line({
        combo: combo({
          pricePolicy: "PERCENT_OFF_SUM",
          fixedPrice: null,
          percentOff: "0",
        }),
        quantity: 1,
        selections: [
          { slotId: "main", optionIds: ["large", "missing"] },
          { slotId: "other", optionIds: ["ghost"] },
        ],
      }),
      new Map([[noVariants.id, noVariants]]),
    );
    expect(value).toBe(8.5);
  });

  it("creates stable keys while keeping course identity distinct", () => {
    const a = comboLineKey(
      line({
        quantity: 1,
        courseNumber: 1,
        selections: [
          { slotId: "b", optionIds: ["2", "1"] },
          { slotId: "a", optionIds: ["4", "3"] },
        ],
      }),
    );
    const b = comboLineKey(
      line({
        quantity: 9,
        courseNumber: 1,
        selections: [
          { slotId: "a", optionIds: ["3", "4"] },
          { slotId: "b", optionIds: ["1", "2"] },
        ],
      }),
    );
    const unassigned = comboLineKey(line({ quantity: 1 }));
    expect(a).toBe(b);
    expect(unassigned).toContain("course none".replace(" ", ""));
    expect(unassigned).not.toBe(a);
  });
});
