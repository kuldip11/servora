import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("inventory void reversal transaction contract", () => {
  const source = readFileSync(
    new URL("../../orders/order-adjustment.repository.ts", import.meta.url),
    "utf8",
  );
  const method = source.slice(
    source.indexOf("async voidItem("),
    source.indexOf("async compItem("),
  );

  it("keeps the void, stock restoration, reversal transaction, and deduction marker in one transaction", () => {
    expect(method).toContain("db.transaction");
    expect(method).toContain("reversalOfDeductionId: deduction.id");
    expect(method).toContain("quantityDeducted");
    expect(method).toContain("reversedAt: new Date()");
    expect(method).toContain('transactionType: "IN"');
  });

  it("E5 reverses every persisted deduction row for the voided order item without re-resolving recipes", () => {
    expect(method).toContain(
      "inArray(orderInventoryDeductions.orderItemId, activeIds)",
    );
    expect(method).toContain("isNull(orderInventoryDeductions.reversedAt)");
    expect(method).toContain("for (const deduction of deductions)");
    expect(method).toContain("deduction.inventoryItemId");
    expect(method).not.toContain("recipes.");
    expect(method).not.toContain("variantId");
    expect(method).not.toContain("modifierOptionId");
    expect(method).not.toContain("subRecipeId");
  });
});
