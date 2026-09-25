import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/features/menu/hooks/useSaveVariantModifierPricing", () => ({
  useSaveVariantModifierPricing: () => ({ mutate: h.save, isPending: false }),
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={props["aria-label"] ?? label} {...props} />
    </label>
  ),
}));

const variants: any[] = [
  { id: "v1", name: "Small", status: "ACTIVE", manualStockCount: 2 },
  { id: "v2", name: "Large", status: "OUT_OF_STOCK", manualStockCount: null },
];
const groups: any[] = [
  {
    id: "g1",
    name: "Milk",
    options: [
      {
        id: "o1",
        name: "Oat",
        additionalPrice: 10,
        isAvailable: true,
        maxQuantity: 1,
        variantPrices: [
          { variantId: "v1", additionalPrice: 12 },
          { variantId: "old", additionalPrice: 7 },
        ],
      },
    ],
  },
];

import { VariantModifierPricingPanel } from "../VariantModifierPricingPanel";

describe("VariantModifierPricingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates per-variant modifier pricing and hides without variants", () => {
    const { rerender } = render(
      <VariantModifierPricingPanel variants={variants} groups={groups} />,
    );
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "20" } });
    fireEvent.change(inputs[1]!, { target: { value: "-5" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save variant prices" }),
    );
    expect(h.save).toHaveBeenCalled();
    const request = h.save.mock.calls[0]?.[0];
    expect(request.groupId).toBe("g1");
    expect(request.patch.options[0].variantPrices).toEqual(
      expect.arrayContaining([
        { variantId: "old", additionalPrice: 7 },
        { variantId: "v1", additionalPrice: 20 },
      ]),
    );
    rerender(<VariantModifierPricingPanel variants={[]} groups={groups} />);
    expect(screen.queryByText(/Price modifiers by variant/)).toBeNull();
  });
});
