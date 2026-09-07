import { describe, expect, it } from "vitest";
import {
  areInventoryUnitsCompatible,
  convertInventoryQuantity,
} from "@/modules/inventory/inventory-units";

describe("inventory unit conversion", () => {
  it("normalizes compatible mass and volume units", () => {
    expect(convertInventoryQuantity(500, "GRAMS", "KG")).toBe(0.5);
    expect(convertInventoryQuantity(1.25, "KG", "GRAMS")).toBe(1250);
    expect(convertInventoryQuantity(750, "ML", "LITERS")).toBe(0.75);
    expect(convertInventoryQuantity(2, "LITERS", "ML")).toBe(2000);
  });

  it("keeps count units exact and rejects incompatible dimensions", () => {
    expect(convertInventoryQuantity(3, "PIECES", "PIECES")).toBe(3);
    expect(areInventoryUnitsCompatible("KG", "ML")).toBe(false);
    expect(() => convertInventoryQuantity(1, "KG", "ML")).toThrow(
      "Incompatible inventory units",
    );
    expect(() => convertInventoryQuantity(1, "PACKETS", "PIECES")).toThrow(
      "Incompatible inventory units",
    );
  });
});

it("rejects non-finite inventory quantities and covers packet compatibility", () => {
  expect(areInventoryUnitsCompatible("PACKETS", "PACKETS")).toBe(true);
  expect(convertInventoryQuantity(2, "PACKETS", "PACKETS")).toBe(2);
  expect(() => convertInventoryQuantity(Number.NaN, "KG", "GRAMS")).toThrow(
    "must be finite",
  );
  expect(() =>
    convertInventoryQuantity(Number.POSITIVE_INFINITY, "KG", "GRAMS"),
  ).toThrow("must be finite");
});
