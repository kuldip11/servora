import { describe, expect, it } from "vitest";
import {
  effectiveMenuItemAvailability,
  effectiveModifierAvailability,
  withEffectiveMenuItemAvailability,
  withEffectiveModifierAvailability,
} from "../availability-view";

describe("availability view helpers", () => {
  it("resolves modifier availability with and without manual overrides", () => {
    expect(effectiveModifierAvailability({ computedAvailability: true })).toBe(true);
    expect(effectiveModifierAvailability({ computedAvailability: true, manualOverrideAvailability: false })).toBe(false);
    expect(withEffectiveModifierAvailability({ computedAvailability: false, manualOverrideAvailability: true, id: "o1" })).toEqual({ computedAvailability: false, manualOverrideAvailability: true, id: "o1", isAvailable: true });
  });

  it("resolves item availability from status, override, and manual stock", () => {
    expect(effectiveMenuItemAvailability({ status: "ACTIVE" })).toBe(true);
    expect(effectiveMenuItemAvailability({ status: "ACTIVE", manualStockCount: 0 })).toBe(false);
    expect(effectiveMenuItemAvailability({ status: "ACTIVE", manualStockCount: 2 })).toBe(true);
    expect(effectiveMenuItemAvailability({ status: "HIDDEN", manualOverrideStatus: "ACTIVE", manualStockCount: null })).toBe(true);
    expect(effectiveMenuItemAvailability({ status: "ACTIVE", manualOverrideStatus: "OUT_OF_STOCK" })).toBe(false);
    expect(withEffectiveMenuItemAvailability({ status: "ACTIVE", id: "i1" })).toEqual({ status: "ACTIVE", id: "i1", isAvailable: true });
  });
});
