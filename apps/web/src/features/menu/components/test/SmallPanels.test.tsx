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

vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: h.invalidate } }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: h.success, notifyError: h.error }));
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
    return { data: fnValue && typeof fnValue.then === "function" ? [] : (fnValue ?? []) };
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
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Input: ({ label, ...props }: any) => <label>{label}<input aria-label={props["aria-label"] ?? label} {...props} /></label>,
}));

import { ChannelOverridesPanel } from "../ChannelOverridesPanel";
import { VariantAvailabilityPanel } from "../VariantAvailabilityPanel";
import { VariantModifierPricingPanel } from "../VariantModifierPricingPanel";
import { CustomerGroupsSection } from "../CustomerGroupsSection";
import { BuffetPricingSection } from "../BuffetPricingSection";

const variants: any[] = [
  { id: "v1", name: "Small", status: "ACTIVE", manualStockCount: 2 },
  { id: "v2", name: "Large", status: "OUT_OF_STOCK", manualOverrideReason: "Sold out", manualStockCount: null },
];
const groups: any[] = [{
  id: "g1", name: "Milk", options: [{ id: "o1", name: "Oat", additionalPrice: 10, isAvailable: true, maxQuantity: 1, variantPrices: [{ variantId: "v1", additionalPrice: 12 }, { variantId: "old", additionalPrice: 7 }] }],
}];

describe("remaining menu panels coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.queryData.clear();
    for (const fn of [h.saveChannelOverride,h.removeChannelOverride,h.updateVariantAvailability,h.setManualStockCount,h.updateModifierGroup,h.createPriceRule,h.removePriceRule,h.createGroup,h.updateGroup,h.deleteGroup]) fn.mockResolvedValue({});
  });

  it("covers channel overrides and variant availability/count controls", async () => {
    h.queryData.set(JSON.stringify(["menu-items", "i1", "channel-overrides"]), [{ id: "co1", channel: "STAFF", fulfillmentType: null, status: null, isHidden: true }]);
    const { rerender } = render(<ChannelOverridesPanel itemId="i1" />);
    expect(screen.getByText(/All fulfillment/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ordering channel"), { target: { value: "STAFF" } });
    fireEvent.change(screen.getByLabelText("Fulfillment type"), { target: { value: "DINE_IN" } });
    fireEvent.change(screen.getByLabelText("Channel status"), { target: { value: "ACTIVE" } });
    fireEvent.change(screen.getByLabelText("Channel override reason"), { target: { value: "open" } });
    fireEvent.click(screen.getByLabelText(/Hide from this channel/));
    fireEvent.click(screen.getByRole("button", { name: "Save override" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(h.saveChannelOverride).toHaveBeenCalledWith("i1", expect.objectContaining({ channel: "STAFF", fulfillmentType: "DINE_IN", status: "ACTIVE", isHidden: true, availabilityReason: "open" })));
    expect(h.removeChannelOverride).toHaveBeenCalledWith("co1");

    rerender(<VariantAvailabilityPanel itemId="i1" variants={variants} />);
    fireEvent.click(screen.getByRole("button", { name: "86 variant" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    const inputs = screen.getAllByLabelText("Finite count");
    fireEvent.change(inputs[0]!, { target: { value: "5" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Set" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "+1" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "+6" })[1]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Stop tracking" })[0]!);
    await waitFor(() => expect(h.updateVariantAvailability).toHaveBeenCalledTimes(2));
    expect(h.setManualStockCount).toHaveBeenCalled();
  });

  it("covers per-variant modifier pricing including invalid and blank cells", async () => {
    const { rerender } = render(<VariantModifierPricingPanel variants={variants} groups={groups} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "20" } });
    fireEvent.change(inputs[1]!, { target: { value: "-5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save variant prices" }));
    await waitFor(() => expect(h.updateModifierGroup).toHaveBeenCalled());
    const payload = h.updateModifierGroup.mock.calls[0]?.[1];
    expect(payload.options[0].variantPrices).toEqual(expect.arrayContaining([{ variantId: "old", additionalPrice: 7 }, { variantId: "v1", additionalPrice: 20 }]));
    rerender(<VariantModifierPricingPanel variants={[]} groups={groups} />);
    expect(screen.queryByText(/Price modifiers by variant/)).toBeNull();
  });

  it("covers customer groups create/edit/delete and all discount modes", async () => {
    h.queryData.set(JSON.stringify(["customer-groups"]), [
      { id: "cg1", name: "VIP", discountPercent: 10, discountFixed: null },
      { id: "cg2", name: "Corp", discountPercent: null, discountFixed: 50 },
      { id: "cg3", name: "Regular", discountPercent: null, discountFixed: null },
    ]);
    render(<CustomerGroupsSection />);
    expect(screen.getByText("10% default discount")).toBeTruthy();
    expect(screen.getByText("₹50.00 default discount")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "New" } });
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "PERCENT" } });
    fireEvent.change(screen.getByLabelText("Percent"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Create group" }));
    await waitFor(() => expect(h.createGroup).toHaveBeenCalledWith({ name: "New", discountPercent: 15, discountFixed: null }));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]!);
    expect(screen.getByLabelText("Amount")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    expect(h.deleteGroup).toHaveBeenCalledWith("cg1");
  });

  it("covers buffet price rule create, tiering, filtering and removal", async () => {
    h.queryData.set(JSON.stringify(["menu", "per-cover-price-rules"]), [
      { id: "r1", isPerCover: true, coverTier: "ADULT", price: 499 },
      { id: "r2", isPerCover: false, coverTier: null, price: 10 },
    ]);
    const { rerender } = render(<BuffetPricingSection />);
    expect(screen.getByText(/ADULT · ₹499.00/)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "CHILD" } });
    fireEvent.change(screen.getByLabelText("Rate per cover"), { target: { value: "299" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rate" }));
    await waitFor(() => expect(h.createPriceRule).toHaveBeenCalledWith({ isPerCover: true, coverTier: "CHILD", price: 299, priority: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(h.removePriceRule).toHaveBeenCalledWith("r1");
    h.queryData.set(JSON.stringify(["menu", "per-cover-price-rules"]), []);
    rerender(<BuffetPricingSection />);
    expect(screen.getByText(/No per-cover rates configured/)).toBeTruthy();
  });
});
