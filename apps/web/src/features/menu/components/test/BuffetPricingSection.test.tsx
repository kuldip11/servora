import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";

const h = vi.hoisted(() => ({
  rules: {
    data: [
      { id: "r1", isPerCover: true, coverTier: "ADULT", price: 499 },
      { id: "r2", isPerCover: false, coverTier: null, price: 10 },
    ] as Array<Record<string, unknown>>,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/features/menu/hooks/useBuffetPricing", () => ({
  usePerCoverPriceRules: () => h.rules,
  useSavePerCoverPriceRule: () => ({ mutate: h.save, isPending: false }),
  useDeletePerCoverPriceRule: () => ({ mutate: h.remove, isPending: false }),
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

import { BuffetPricingSection } from "../BuffetPricingSection";

describe("BuffetPricingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.rules.data = [
      { id: "r1", isPerCover: true, coverTier: "ADULT", price: 499 },
      { id: "r2", isPerCover: false, coverTier: null, price: 10 },
    ];
    h.rules.isError = false;
  });

  it("creates, filters and removes per-cover price rules", () => {
    const { rerender } = render(<BuffetPricingSection />);
    expect(screen.getByText(/ADULT · ₹499.00/)).toBeTruthy();
    chooseSelectOption("Cover tier", "Child");
    fireEvent.change(screen.getByLabelText("Rate per cover"), {
      target: { value: "299" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add rate" }));
    expect(h.save).toHaveBeenCalledWith(
      { tier: "CHILD", price: 299 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(h.remove).toHaveBeenCalledWith("r1");
    h.rules.data = [];
    rerender(<BuffetPricingSection />);
    expect(screen.getByText(/No per-cover rates configured/)).toBeTruthy();
  });
});
