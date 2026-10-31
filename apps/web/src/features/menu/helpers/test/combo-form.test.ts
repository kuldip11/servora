import { describe, expect, it, vi } from "vitest";
import {
  buildComboPayload,
  comboFieldKey,
  mapComboApiFieldErrors,
  validateComboDraft,
  type ComboDraft,
} from "../combo-form";

vi.mock("@pos/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/api-client")>()),
  extractApiFieldErrors: (error: unknown) =>
    (error as { fieldErrors?: Record<string, string[]> })?.fieldErrors ?? {},
}));

const draft = (): ComboDraft => ({
  name: "Lunch Combo",
  description: "Main + side",
  policy: "FIXED",
  amount: "299",
  slots: [
    {
      key: "slot-a",
      name: "Main",
      minSelections: "1",
      maxSelections: "1",
      options: [
        {
          key: "option-a",
          menuItemId: "item-1",
          variantId: "",
          upcharge: "0",
          isUnlimitedRefill: false,
        },
      ],
    },
  ],
});

describe("combo form helpers", () => {
  it("validates locally knowable combo constraints", () => {
    const value = draft();
    value.name = "";
    value.policy = "PERCENT_OFF_SUM";
    value.amount = "101";
    value.slots[0]!.minSelections = "2";
    value.slots[0]!.options[0]!.menuItemId = "";

    const errors = validateComboDraft(value);

    expect(errors[comboFieldKey.name]).toBeTruthy();
    expect(errors[comboFieldKey.amount]).toBeTruthy();
    expect(errors[comboFieldKey.slotMin("slot-a")]).toBeTruthy();
    expect(errors[comboFieldKey.optionItem("slot-a", "option-a")]).toBeTruthy();
  });

  it("builds the normalized request payload", () => {
    expect(buildComboPayload(draft())).toEqual({
      name: "Lunch Combo",
      description: "Main + side",
      pricePolicy: "FIXED",
      fixedPrice: 299,
      slots: [
        {
          name: "Main",
          minSelections: 1,
          maxSelections: 1,
          options: [
            {
              menuItemId: "item-1",
              upcharge: 0,
              isUnlimitedRefill: false,
            },
          ],
        },
      ],
    });
  });

  it("maps backend field errors to dynamic draft fields and preserves unknown errors", () => {
    const value = draft();
    const result = mapComboApiFieldErrors(
      {
        fieldErrors: {
          percentOff: ["Percent is invalid"],
          "slots.0.options.0.menuItemId": ["Menu item is unavailable"],
          unsupported: ["Review this server validation error"],
        },
      },
      value.slots,
    );

    expect(result.fieldErrors[comboFieldKey.amount]).toBe("Percent is invalid");
    expect(
      result.fieldErrors[comboFieldKey.optionItem("slot-a", "option-a")],
    ).toBe("Menu item is unavailable");
    expect(result.formMessages).toEqual([
      "Review this server validation error",
    ]);
  });
});
