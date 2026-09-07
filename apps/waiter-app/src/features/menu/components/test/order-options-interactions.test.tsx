import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children, footer, onClose }: any) => open ? <section><h2>{title}</h2><button onClick={onClose}>modal-close</button>{children}{footer}</section> : null,
  SelectMenu: ({ label, value, onChange, options = [], "aria-label": aria }: any) => <label>{label}<select aria-label={aria ?? label} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{!options.some((o: any) => o.value === "") && <option value="" />} {options.map((o: any) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select></label>,
}));

import { OrderOptionsPanel } from "@/features/menu/components/OrderOptionsPanel";

const types: any = [
  { value: "DINE_IN", label: "Dine In", capabilityKey: "dineInEnabled" },
  { value: "TAKEAWAY", label: "Takeaway", capabilityKey: "takeawayEnabled" },
  { value: "DELIVERY", label: "Delivery", capabilityKey: "deliveryEnabled" },
];
const tables: any = [
  { id: "t2", name: "Bravo", capacity: 2, section: "Patio", status: "AVAILABLE", isActive: true },
  { id: "t1", name: "Alpha", capacity: 4, section: "Main", status: "AVAILABLE", isActive: true },
  { id: "t3", name: "Busy", capacity: 6, section: "Main", status: "OCCUPIED", isActive: true },
  { id: "t4", name: "Reserved", capacity: 2, status: "RESERVED", isActive: true },
];

const props = (overrides: any = {}) => ({
  availableOrderTypes: types, orderType: "DINE_IN", onOrderTypeChange: vi.fn(), tablesEnabled: true, tables, tableId: "", onTableChange: vi.fn(),
  customerId: "", customerName: "", onClearCustomer: vi.fn(), customerSearch: "", onCustomerSearchChange: vi.fn(),
  customerResults: [{ id: "c1", name: "Ada", phone: "999" }, { id: "c2", name: "No Contact" }], onSelectCustomer: vi.fn(),
  customerGroups: [{ id: "g1", name: "VIP" }], customerGroupId: "", onCustomerGroupChange: vi.fn(), billingMode: "LINE_ITEMS", onBillingModeChange: vi.fn(),
  coverCount: 1, onCoverCountChange: vi.fn(), perCoverRules: [{ id: "r1", coverTier: "ADULT", price: 100 }, { id: "r2", coverTier: null, price: null }], perCoverPriceRuleId: "", onPerCoverPriceRuleChange: vi.fn(),
  ...overrides,
});

describe("OrderOptionsPanel interactions", () => {
  it("covers service type, table search/filter/selection and context close", () => {
    const p = props();
    render(<OrderOptionsPanel {...p} />);
    expect(screen.getByText("Set order details")).toBeTruthy();
    fireEvent.click(screen.getByText("Takeaway"));
    expect(p.onOrderTypeChange).toHaveBeenCalledWith("TAKEAWAY");
    expect(p.onTableChange).toHaveBeenCalledWith("");

    fireEvent.change(screen.getByLabelText("Search tables"), { target: { value: "alpha" } });
    expect(screen.getByText("Alpha")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search tables"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Occupied" }));
    expect(screen.getByText("Busy")).toBeTruthy();
    fireEvent.click(screen.getByText("All"));
    fireEvent.click(screen.getByText("Alpha"));
    expect(p.onTableChange).toHaveBeenCalledWith("t1");
  });

  it("covers customer advanced controls and per-cover billing", () => {
    const p = props({ tableId: "t1" });
    const { rerender } = render(<OrderOptionsPanel {...p} />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Customer and billing"));
    fireEvent.change(screen.getByLabelText("Search customer by name or phone"), { target: { value: "ad" } });
    expect(p.onCustomerSearchChange).toHaveBeenCalledWith("ad");
    fireEvent.click(screen.getByText("Ada"));
    expect(p.onSelectCustomer).toHaveBeenCalledWith("c1", "Ada");
    fireEvent.change(screen.getByLabelText("Customer group"), { target: { value: "g1" } });
    fireEvent.change(screen.getByLabelText("Billing mode"), { target: { value: "PER_COVER" } });
    expect(p.onCustomerGroupChange).toHaveBeenCalledWith("g1");
    expect(p.onBillingModeChange).toHaveBeenCalledWith("PER_COVER");

    const p2 = props({ tableId: "t1", customerId: "c1", customerName: "Ada", billingMode: "PER_COVER", perCoverPriceRuleId: "r1" });
    rerender(<OrderOptionsPanel {...p2} />);
    fireEvent.click(screen.getByLabelText("Remove customer"));
    fireEvent.change(screen.getByLabelText("Covers"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "r2" } });
    expect(p2.onClearCustomer).toHaveBeenCalled();
    expect(p2.onCoverCountChange).toHaveBeenCalledWith(1);
    expect(p2.onPerCoverPriceRuleChange).toHaveBeenCalledWith("r2");
  });

  it("covers no order types, empty tables and unavailable-table messaging", () => {
    const { rerender } = render(<OrderOptionsPanel {...props({ availableOrderTypes: [], tables: [] })} />);
    expect(screen.getByText(/No order types are enabled/)).toBeTruthy();
    expect(screen.getByText(/No tables are configured/)).toBeTruthy();
    rerender(<OrderOptionsPanel {...props({ tables: [{ id: "t9", name: "Busy", capacity: 2, status: "OCCUPIED", isActive: true }] })} />);
    expect(screen.getByText(/No table is currently available/)).toBeTruthy();
  });
});
