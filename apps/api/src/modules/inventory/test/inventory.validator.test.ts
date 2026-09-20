import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createInventoryItemBody,
  updateStockBody,
  inventoryItemIdParams,
} from "@/modules/inventory/inventory.validator";
describe("inventory validators", () => {
  it("accepts valid inventory items and rejects negative numeric fields", () => {
    expect(
      Value.Check(createInventoryItemBody, {
        name: "Flour",
        unit: "KG",
        currentStock: 10,
        minimumStock: 2,
        reorderPoint: 3,
        costPerUnit: 4,
      }),
    ).toBe(true);
    expect(
      Value.Check(createInventoryItemBody, {
        name: "Flour",
        unit: "KG",
        currentStock: -1,
        minimumStock: 2,
        reorderPoint: 3,
        costPerUnit: 4,
      }),
    ).toBe(false);
  });
  it("enforces allowed units and transaction types", () => {
    expect(
      Value.Check(createInventoryItemBody, {
        name: "x",
        unit: "BAD",
        currentStock: 0,
        minimumStock: 0,
        reorderPoint: 0,
        costPerUnit: 0,
      }),
    ).toBe(false);
    expect(
      Value.Check(updateStockBody, {
        quantity: 1,
        transactionType: "ADJUSTMENT",
      }),
    ).toBe(true);
    expect(
      Value.Check(updateStockBody, { quantity: 1, transactionType: "BAD" }),
    ).toBe(false);
  });
  it("validates item id params", () => {
    expect(
      Value.Check(inventoryItemIdParams, {
        id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(true);
    expect(Value.Check(inventoryItemIdParams, { id: "i1" })).toBe(false);
    expect(Value.Check(inventoryItemIdParams, { id: 1 })).toBe(false);
  });
});
