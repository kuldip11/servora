import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { createPromotionBody, promotionParams, promotionPreviewBody, updatePromotionBody } from "../promotion.validator";
const uuid = "11111111-1111-4111-8111-111111111111";
describe("promotion validators", () => {
  it("accepts valid payloads and rejects invalid constraints", () => {
    expect(Value.Check(createPromotionBody, { name: "Promo", ruleType: "PERCENTAGE", scope: "ORDER", value: 10 })).toBe(true);
    expect(Value.Check(createPromotionBody, { name: "", ruleType: "PERCENTAGE", scope: "ORDER" })).toBe(false);
    expect(Value.Check(createPromotionBody, { name: "Promo", ruleType: "PERCENTAGE", scope: "ORDER", value: 0 })).toBe(false);
    expect(Value.Check(updatePromotionBody, {})).toBe(true);
    expect(Value.Check(promotionParams, {})).toBe(false);
    expect(Value.Check(promotionPreviewBody, { promotion: { name: "Promo", ruleType: "PERCENTAGE", scope: "ORDER", value: 10 }, items: [{ menuItemId: uuid, quantity: 1 }] })).toBe(true);
    expect(Value.Check(promotionPreviewBody, { promotion: { name: "Promo", ruleType: "PERCENTAGE", scope: "ORDER", value: 10 }, items: [] })).toBe(false);
  });
});
