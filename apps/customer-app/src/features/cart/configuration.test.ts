import { describe, expect, it } from "vitest";
import type { CustomerMenuItem } from "@/api";
import {
  canAddItemConfiguration,
  normalizeSelectedOptions,
  validateItemConfiguration,
} from "./configuration";

const baseItem = (overrides: Record<string, unknown> = {}) =>
  ({
    pricingMode: "FIXED",
    variants: [],
    supportsZones: false,
    modifierGroupLinks: [],
    ...overrides,
  }) as unknown as CustomerMenuItem;

const option = (overrides: Record<string, unknown> = {}) => ({
  id: "opt-1",
  name: "Cheese",
  isAvailable: true,
  maxQuantity: 2,
  ...overrides,
});

const group = (overrides: Record<string, unknown> = {}) => ({
  id: "g1",
  name: "Toppings",
  minSelections: 1,
  maxSelections: 2,
  selectionType: "MULTIPLE",
  dependsOnOptionId: null,
  options: [option()],
  ...overrides,
});

describe("item configuration", () => {
  it("normalizes by removing zero quantities and sorting by option and zone", () => {
    expect(
      normalizeSelectedOptions([
        { optionId: "b", quantity: 1, zoneLabel: "RIGHT" },
        { optionId: "a", quantity: 0 },
        { optionId: "b", quantity: 1, zoneLabel: "LEFT" },
      ]),
    ).toEqual([
      { optionId: "b", quantity: 1, zoneLabel: "LEFT" },
      { optionId: "b", quantity: 1, zoneLabel: "RIGHT" },
    ]);
  });

  it("blocks staff-priced items and required variants", () => {
    expect(
      validateItemConfiguration(
        baseItem({ pricingMode: "OPEN" }),
        undefined,
        [],
      ),
    ).toContain("staff-assisted");
    expect(
      validateItemConfiguration(
        baseItem({ pricingMode: "WEIGHT_BASED" }),
        undefined,
        [],
      ),
    ).toContain("staff-assisted");
    expect(
      validateItemConfiguration(
        baseItem({ variants: [{ id: "v1" }] }),
        undefined,
        [],
      ),
    ).toContain("Choose an option");
  });

  it("rejects stale, unavailable, out-of-range and duplicate modifier choices", () => {
    const item = baseItem({ modifierGroupLinks: [{ group: group() }] });
    expect(
      validateItemConfiguration(item, undefined, [
        { optionId: "missing", quantity: 1 },
      ]),
    ).toContain("no longer available");

    const unavailable = baseItem({
      modifierGroupLinks: [
        { group: group({ options: [option({ isAvailable: false })] }) },
      ],
    });
    expect(
      validateItemConfiguration(unavailable, undefined, [
        { optionId: "opt-1", quantity: 1 },
      ]),
    ).toContain("no longer available");
    expect(
      validateItemConfiguration(item, undefined, [
        { optionId: "opt-1", quantity: 3 },
      ]),
    ).toContain("allows up to 2");
    expect(
      validateItemConfiguration(item, undefined, [
        { optionId: "opt-1", quantity: 1 },
        { optionId: "opt-1", quantity: 1 },
      ]),
    ).toContain("selected more than once");
  });

  it("enforces min, max and single-selection rules including zoned items", () => {
    const required = baseItem({ modifierGroupLinks: [{ group: group() }] });
    expect(validateItemConfiguration(required, undefined, [])).toContain(
      "at least 1",
    );

    const maxOne = baseItem({
      modifierGroupLinks: [
        {
          group: group({
            maxSelections: 1,
            options: [option(), option({ id: "opt-2", name: "Olives" })],
          }),
        },
      ],
    });
    expect(
      validateItemConfiguration(maxOne, undefined, [
        { optionId: "opt-1", quantity: 1 },
        { optionId: "opt-2", quantity: 1 },
      ]),
    ).toContain("at most 1");

    const single = baseItem({
      modifierGroupLinks: [
        {
          group: group({
            maxSelections: 3,
            selectionType: "SINGLE",
            options: [option(), option({ id: "opt-2", name: "Olives" })],
          }),
        },
      ],
    });
    expect(
      validateItemConfiguration(single, undefined, [
        { optionId: "opt-1", quantity: 1 },
        { optionId: "opt-2", quantity: 1 },
      ]),
    ).toContain("only one");

    const zoned = baseItem({
      supportsZones: true,
      modifierGroupLinks: [{ group: group() }],
    });
    expect(
      validateItemConfiguration(zoned, undefined, [
        { optionId: "opt-1", quantity: 1, zoneLabel: "LEFT" },
      ]),
    ).toContain("right side");
  });

  it("skips dependent groups until their trigger is selected and exposes a boolean helper", () => {
    const item = baseItem({
      modifierGroupLinks: [
        { group: group({ id: "dependent", dependsOnOptionId: "trigger" }) },
      ],
    });
    expect(validateItemConfiguration(item, undefined, [])).toBeNull();
    expect(canAddItemConfiguration(item, undefined, [])).toBe(true);
  });
});
