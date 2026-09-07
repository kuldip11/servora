import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  queryData: new Map<string, unknown>(),
  invalidate: vi.fn(async () => {}),
  success: vi.fn(),
  error: vi.fn(),
  listChannelOverrides: vi.fn(),
  saveChannelOverride: vi.fn(),
  removeChannelOverride: vi.fn(),
  updateVariantAvailability: vi.fn(),
  setManualStockCount: vi.fn(),
  updateModifierGroup: vi.fn(),
  listPriceRulesFor: vi.fn(),
  createPriceRule: vi.fn(),
  removePriceRule: vi.fn(),
  listGroups: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: h.invalidate },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: h.success,
  notifyError: h.error,
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@pos/api-client", () => ({
  createMenuApi: () => ({
    listChannelOverrides: h.listChannelOverrides,
    saveChannelOverride: h.saveChannelOverride,
    removeChannelOverride: h.removeChannelOverride,
    updateVariantAvailability: h.updateVariantAvailability,
    setManualStockCount: h.setManualStockCount,
    updateModifierGroup: h.updateModifierGroup,
    listPriceRulesFor: h.listPriceRulesFor,
    createPriceRule: h.createPriceRule,
    removePriceRule: h.removePriceRule,
  }),
  createCustomersApi: () => ({
    listGroups: h.listGroups,
    createGroup: h.createGroup,
    updateGroup: h.updateGroup,
    deleteGroup: h.deleteGroup,
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey, queryFn }: any) => {
    const key = JSON.stringify(queryKey);
    const value = h.queryData.get(key);
    if (value !== undefined) return { data: value };
    const fnValue = queryFn?.();
    return {
      data:
        fnValue && typeof fnValue.then === "function" ? [] : (fnValue ?? []),
    };
  },
  useMutation: (config: any) => ({
    isPending: false,
    mutate: (arg?: any, options?: any) => {
      try {
        Promise.resolve(config.mutationFn(arg))
          .then((value) => {
            config.onSuccess?.(value);
            options?.onSuccess?.(value);
          })
          .catch((error) => {
            config.onError?.(error);
            options?.onError?.(error);
          });
      } catch (error) {
        config.onError?.(error);
        options?.onError?.(error);
      }
    },
  }),
}));
vi.mock("@pos/ui", () => ({
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
  {
    id: "v2",
    name: "Large",
    status: "OUT_OF_STOCK",
    manualOverrideReason: "Sold out",
    manualStockCount: null,
  },
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

import { BuffetPricingSection } from "../BuffetPricingSection";

describe("BuffetPricingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.queryData.clear();
    for (const fn of [
      h.saveChannelOverride,
      h.removeChannelOverride,
      h.updateVariantAvailability,
      h.setManualStockCount,
      h.updateModifierGroup,
      h.createPriceRule,
      h.removePriceRule,
      h.createGroup,
      h.updateGroup,
      h.deleteGroup,
    ])
      fn.mockResolvedValue({});
  });

  it("creates, filters and removes per-cover price rules", async () => {
    h.queryData.set(JSON.stringify(["menu", "per-cover-price-rules"]), [
      { id: "r1", isPerCover: true, coverTier: "ADULT", price: 499 },
      { id: "r2", isPerCover: false, coverTier: null, price: 10 },
    ]);
    const { rerender } = render(<BuffetPricingSection />);
    expect(screen.getByText(/ADULT · ₹499.00/)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "CHILD" },
    });
    fireEvent.change(screen.getByLabelText("Rate per cover"), {
      target: { value: "299" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add rate" }));
    await waitFor(() =>
      expect(h.createPriceRule).toHaveBeenCalledWith({
        isPerCover: true,
        coverTier: "CHILD",
        price: 299,
        priority: 0,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(h.removePriceRule).toHaveBeenCalledWith("r1");
    h.queryData.set(JSON.stringify(["menu", "per-cover-price-rules"]), []);
    rerender(<BuffetPricingSection />);
    expect(screen.getByText(/No per-cover rates configured/)).toBeTruthy();
  });
});
