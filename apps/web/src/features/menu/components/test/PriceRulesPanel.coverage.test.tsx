import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  create: vi.fn(), remove: vi.fn(), listRules: vi.fn(), listGroups: vi.fn(), invalidate: vi.fn(), getError: vi.fn(),
}));
let rules: any[] = [];
let groups: any[] = [];

vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
}));
vi.mock("@pos/api-client", () => ({
  createMenuApi: () => ({ listPriceRulesFor: h.listRules, createPriceRule: h.create, removePriceRule: h.remove }),
  createCustomersApi: () => ({ listGroups: h.listGroups }),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: h.invalidate } }));
vi.mock("@/shared/lib/errors", () => ({ getErrorMessage: h.getError }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (cfg: any) => ({ data: cfg.queryKey[0] === "customer-groups" ? groups : rules }),
  useMutation: (cfg: any) => ({
    isPending: false,
    mutate: (arg?: any) => Promise.resolve().then(() => cfg.mutationFn(arg)).then((v) => cfg.onSuccess?.(v, arg)).catch((e) => cfg.onError?.(e, arg)),
  }),
}));

import { PriceRulesPanel } from "../PriceRulesPanel";

describe("PriceRulesPanel coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks(); groups = [{ id: "g1", name: "VIP" }]; rules = []; h.create.mockResolvedValue({}); h.remove.mockResolvedValue({}); h.getError.mockReturnValue("Save failed");
  });

  it("covers rendering rules, descriptions, removal and fully scoped save", async () => {
    rules = [
      { id: "r1", percentOff: 10, price: null, channel: null, fulfillmentType: null, branchId: null, startDate: null, endDate: null, startTime: null, endTime: null, priority: 1 },
      { id: "r2", percentOff: null, price: 125, channel: "STAFF", fulfillmentType: "DINE_IN", branchId: "b1", startDate: "2026-09-01", endDate: null, startTime: "17:00", endTime: null, priority: 3 },
    ];
    render(<PriceRulesPanel itemId="i1" branchId="b1" />);
    expect(screen.getByText(/10% off/)).toBeTruthy();
    expect(screen.getByText(/₹125/)).toBeTruthy();
    expect(screen.getByText(/2026-09-01 → …/)).toBeTruthy();
    expect(screen.getByText(/17:00–24:00/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith("r1"));
    expect(h.invalidate).toHaveBeenCalledWith({ queryKey: ["menu-items", "i1", "price-rules"] });

    fireEvent.change(screen.getByLabelText("Rule channel"), { target: { value: "STAFF" } });
    fireEvent.change(screen.getByLabelText("Rule fulfillment type"), { target: { value: "DELIVERY" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Rule start date"), { target: { value: "2026-09-05" } });
    fireEvent.change(screen.getByLabelText("Rule end date"), { target: { value: "2026-09-06" } });
    fireEvent.change(screen.getByLabelText("Rule start time"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Rule end time"), { target: { value: "11:00" } });
    fireEvent.change(screen.getByLabelText("Customer group scope"), { target: { value: "g1" } });
    fireEvent.change(screen.getByLabelText("Rule price"), { target: { value: "99.5" } });
    fireEvent.change(screen.getByLabelText("Rule priority"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save price rule" }));
    await waitFor(() => expect(h.create).toHaveBeenCalled());
    expect(h.create.mock.calls[0][0]).toEqual({
      menuItemId: "i1", branchId: "b1", channel: "STAFF", fulfillmentType: "DELIVERY", startDate: "2026-09-05", endDate: "2026-09-06", startTime: "10:00", endTime: "11:00", customerGroupId: "g1", price: 99.5, priority: 4,
    });
    expect(h.invalidate).toHaveBeenCalledWith({ queryKey: ["menu-items", "i1", "price-rules"] });
  });

  it("covers optional fields, no branch checkbox, zero priority fallback and save error", async () => {
    h.create.mockRejectedValueOnce(new Error("boom"));
    render(<PriceRulesPanel itemId="i2" />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    const save = screen.getByRole("button", { name: "Save price rule" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Rule price"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Rule priority"), { target: { value: "abc" } });
    fireEvent.click(save);
    await waitFor(() => expect(h.getError).toHaveBeenCalledWith(expect.any(Error), "Could not save price rule"));
    expect(screen.getByText("Save failed")).toBeTruthy();
    expect(h.create.mock.calls[0][0]).toEqual({ menuItemId: "i2", branchId: undefined, channel: undefined, fulfillmentType: undefined, startDate: undefined, endDate: undefined, startTime: undefined, endTime: undefined, customerGroupId: undefined, price: 50, priority: 0 });
  });
});
