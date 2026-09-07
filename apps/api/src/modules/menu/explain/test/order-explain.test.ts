import { describe, expect, it } from "vitest";
import { replayPersistedLine } from "@/modules/menu/explain/order-explain.service";

describe("H1 deterministic pricing replay", () => {
  it("recomputes a normal line from immutable pipeline attribution", () => {
    const replay = replayPersistedLine({
      quantity: 2,
      unitPrice: "14.00",
      subtotal: "28.00",
      pricingAttribution: {
        BASE_PRICE: 10,
        VARIANT: 2,
        MODIFIER: 2,
        PRICE_SOURCE: {
          kind: "PRICE_RULE",
          id: "rule-1",
          description: "Happy hour",
        },
      },
    });
    expect(replay.matchesSnapshot).toBe(true);
    expect(replay.replayedSubtotal).toBe(28);
    expect(replay.priceSource?.id).toBe("rule-1");
  });

  it("replays combo allocation and discounts without consulting mutable menu state", () => {
    const replay = replayPersistedLine({
      quantity: 1,
      unitPrice: "8.00",
      subtotal: "8.00",
      pricingAttribution: {
        BASE_PRICE: 10,
        VARIANT: 0,
        MODIFIER: 0,
        COMBO: -2,
        PROMOTION: -1,
        LOYALTY: -0.5,
        PRICE_SOURCE: { kind: "MENU_ITEM", id: "item-1", description: "Base" },
      },
    });
    expect(replay.matchesSnapshot).toBe(true);
    expect(replay.preComboSubtotal).toBe(10);
    expect(replay.replayedSubtotal).toBe(8);
    expect(replay.payableBeforeTax).toBe(6.5);
  });
});
