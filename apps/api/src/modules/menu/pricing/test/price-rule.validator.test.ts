import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { createHappyHourBody, createPriceRuleBody, listPriceRulesQuery, priceRuleParams, updatePriceRuleBody } from "../price-rule.validator";
describe("price rule validators", () => {
  it("accepts valid payloads and rejects invalid bounds", () => {
    expect(Value.Check(createPriceRuleBody, { price: 0, percentOff: 50, startTime: "09:00", endTime: "10:30:00" })).toBe(true);
    expect(Value.Check(createPriceRuleBody, { price: -1 })).toBe(false); expect(Value.Check(createPriceRuleBody, { percentOff: 0 })).toBe(false); expect(Value.Check(createPriceRuleBody, { taxRate: 101 })).toBe(false);
    expect(Value.Check(updatePriceRuleBody, {})).toBe(true); expect(Value.Check(priceRuleParams, { id: "r1" })).toBe(true); expect(Value.Check(listPriceRulesQuery, { menuItemId: "i1", menuItemSku: "sku" })).toBe(true);
    expect(Value.Check(createHappyHourBody, { percentOff: 20, startTime: "17:00", endTime: "19:00" })).toBe(true); expect(Value.Check(createHappyHourBody, { percentOff: 101, startTime: "17:00", endTime: "19:00" })).toBe(false);
  });
});
