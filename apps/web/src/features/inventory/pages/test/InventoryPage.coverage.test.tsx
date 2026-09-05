import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn(), items: { current: {} as any }, low: { current: [] as any[] }, branches: { current: [] as any[] }, transactions: { current: [] as any[] }, reasons: { current: [] as any[] }, impact: { current: { data: undefined, isLoading: false } as any },
  add: vi.fn(), update: vi.fn(), waste: vi.fn(), createReason: vi.fn(), realtime: vi.fn(),
}));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/branches/hooks/useBranches", () => ({ useBranches: () => ({ data: mocks.branches.current }) }));
vi.mock("@/features/inventory/hooks/useInventoryItems", () => ({ useInventoryItems: () => mocks.items.current, useLowStockItems: () => ({ data: mocks.low.current }) }));
vi.mock("@/features/inventory/hooks/useAddInventoryItem", () => ({ useAddInventoryItem: () => ({ mutate: mocks.add, isPending: false }) }));
vi.mock("@/features/inventory/hooks/useUpdateInventoryStock", () => ({ useUpdateInventoryStock: () => ({ mutate: mocks.update, isPending: false }) }));
vi.mock("@/features/inventory/hooks/useInventoryRealtimeSync", () => ({ useInventoryRealtimeSync: mocks.realtime }));
vi.mock("@/features/inventory/hooks/useInventoryTransactions", () => ({ useInventoryTransactions: () => ({ data: mocks.transactions.current }) }));
vi.mock("@/features/inventory/hooks/useWasteReasons", () => ({ useWasteReasons: () => ({ data: mocks.reasons.current }) }));
vi.mock("@/features/inventory/hooks/useInventoryRecipeImpact", () => ({ useInventoryRecipeImpact: () => mocks.impact.current }));
vi.mock("@/features/inventory/hooks/useLogInventoryWaste", () => ({ useLogInventoryWaste: () => ({ mutate: mocks.waste, isPending: false }), useCreateWasteReason: () => ({ mutate: mocks.createReason, isPending: false }) }));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("lucide-react", () => ({ Plus: () => null, AlertTriangle: () => null, Package: () => null, Building2: () => null, History: () => null, MoreHorizontal: () => null }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>, Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Modal: ({ open, title, children, onClose }: any) => open ? <div role="dialog"><h2>{title}</h2><button onClick={onClose}>modal-x</button>{children}</div> : null,
  Input: React.forwardRef<HTMLInputElement, any>(({ label, hint, error, ...props }, ref) => <label>{label ?? props["aria-label"]}<input ref={ref} aria-label={props["aria-label"] ?? label} {...props}/>{hint ? <span>{hint}</span> : null}{error ? <span>{error}</span> : null}</label>),
  Select: React.forwardRef<HTMLSelectElement, any>(({ label, options = [], error, ...props }, ref) => <label>{label}<select ref={ref} aria-label={label} {...props}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{error ? <span>{error}</span> : null}</label>),
  StatCard: ({ title, value }: any) => <div>{title}:{value}</div>, StatusBadge: ({ label }: any) => <span>{label}</span>, Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>, PageHeader: ({ title, description, actions }: any) => <header><h1>{title}</h1><span>{description}</span>{actions}</header>, Grid: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  FilterBar: ({ children, onClearAll }: any) => <div>{children}{onClearAll ? <button onClick={onClearAll}>clear-all</button> : null}</div>,
  SearchInput: ({ value, onChange, onClear, ...props }: any) => <div><input value={value} onChange={onChange} {...props}/><button onClick={onClear}>clear-search</button></div>,
  SelectMenu: ({ value, onChange, ...props }: any) => <select aria-label={props["aria-label"]} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">All</option><option value="low">Low</option></select>,
  Pagination: ({ page, pageCount, onPageChange, onPageSizeChange }: any) => <div>page-{page}-of-{pageCount}<button onClick={() => onPageChange(2)}>next</button><button onClick={() => onPageSizeChange(50)}>size</button></div>,
  IconButton: ({ "aria-label": label }: any) => <button aria-label={label}>{label}</button>,
  DropdownMenu: ({ trigger, items }: any) => <div>{trigger}{items.map((item: any) => <button key={item.label} onClick={item.onSelect}>{item.label}</button>)}</div>,
  Table: ({ columns, data, emptyTitle, emptyAction }: any) => <div>{data.length ? data.map((row: any) => <div key={row.id}>{columns.map((c: any) => <span key={c.id}>{c.cell ? c.cell(row) : null}</span>)}</div>) : <div>{emptyTitle}{emptyAction}</div>}</div>,
}));

import { useAuthStore } from "@/store/auth";
import { InventoryPage } from "../InventoryPage";

const item = { id: "i1", name: "Chicken", unit: "KG", currentStock: "2", minimumStock: "5", reorderPoint: "6", costPerUnit: "200", branch: { name: "Central" } } as any;
const item2 = { id: "i2", name: "Rice", unit: "KG", currentStock: "20", minimumStock: "5", reorderPoint: "6", costPerUnit: "50", branch: undefined } as any;

describe("InventoryPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.has.mockReturnValue(true); useAuthStore.setState({ branchId: "b1" });
    mocks.items.current = { data: { items: [item, item2], pagination: { total: 52 } }, isLoading: false }; mocks.low.current = [item]; mocks.branches.current = [{ id: "b1", name: "Central" }];
    mocks.transactions.current = [{ id: "t1", transactionType: "WASTE", quantity: "1", createdAt: "2026-09-01T10:00:00Z", inventoryItem: { name: "Chicken", unit: "KG" }, wasteReason: { label: "Spoilage" }, notes: "bad" }, { id: "t2", transactionType: "IN", quantity: "3", createdAt: "2026-09-01T11:00:00Z", inventoryItem: undefined, reversalOfDeductionId: "d1", notes: "" }];
    mocks.reasons.current = [{ id: "wr1", label: "Spoilage" }]; mocks.impact.current = { data: { impacts: [{ kind: "ITEM", entityId: "e1", entityName: "Paneer", menuItemName: "Paneer", computedAvailable: true }, { kind: "VARIANT", entityId: "e2", entityName: "Large", menuItemName: "Pizza", computedAvailable: false }, { kind: "MODIFIER_OPTION", entityId: "e3", entityName: "Cheese", menuItemName: "Burger", computedAvailable: true }] }, isLoading: false };
  });
  it("renders inventory, filters, transactions and stock updates", async () => {
    render(<InventoryPage />); expect(screen.getByText("52 items tracked in the current view")).toBeTruthy(); expect(screen.getByText("Low Stock Alerts (1)")).toBeTruthy(); expect(screen.getByText("Chicken — 2 KG")).toBeTruthy();
    expect(screen.getByText("VOID REVERSAL")).toBeTruthy(); expect(screen.getByText("Spoilage · bad")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search inventory"), { target: { value: "chicken" } }); fireEvent.change(screen.getByLabelText("Filter inventory by stock level"), { target: { value: "low" } }); fireEvent.click(screen.getByRole("button", { name: "clear-all" }));
    fireEvent.click(screen.getByRole("button", { name: "next" })); fireEvent.click(screen.getByRole("button", { name: "size" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Update Stock" })[0]!); expect(screen.getByRole("heading", { name: "Update Stock: Chicken" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "4" } }); fireEvent.click(screen.getByRole("button", { name: "Update" })); await waitFor(() => expect(mocks.update).toHaveBeenCalled());
  });
  it("adds items and handles waste and recipe impact flows", async () => {
    render(<InventoryPage />); fireEvent.click(screen.getAllByRole("button", { name: /Add Item/ })[0]!); fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Oil" } }); fireEvent.click(screen.getAllByRole("button", { name: "Add Item" }).at(-1)!); await waitFor(() => expect(mocks.add).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: "Log waste" })[0]!); expect(screen.getByRole("heading", { name: "Log Waste: Chicken" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Waste reason"), { target: { value: "wr1" } }); fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "trim" } }); fireEvent.click(screen.getByRole("button", { name: "Log Waste" })); await waitFor(() => expect(mocks.waste).toHaveBeenCalledWith(expect.objectContaining({ itemId: "i1", wasteReasonId: "wr1", notes: "trim" }), expect.any(Object)));
    fireEvent.click(screen.getAllByRole("button", { name: "Log waste" })[0]!); fireEvent.change(screen.getByLabelText("New waste reason"), { target: { value: "Prep trim" } }); mocks.createReason.mockImplementation((_name, opts) => opts.onSuccess({ id: "wr2" })); fireEvent.click(screen.getByRole("button", { name: "Add" })); expect(mocks.createReason).toHaveBeenCalledWith("Prep trim", expect.any(Object));
    fireEvent.click(screen.getAllByRole("button", { name: "Recipe impact" })[0]!); expect(screen.getByRole("heading", { name: "Recipe impact: Chicken" })).toBeTruthy(); expect(screen.getByText("Base item")).toBeTruthy(); expect(screen.getByText("Variant")).toBeTruthy(); expect(screen.getByText("Modifier option")).toBeTruthy(); expect(screen.getByText("Auto 86")).toBeTruthy();
  });
  it("covers aggregate grouping and empty states", () => {
    useAuthStore.setState({ branchId: "all" }); mocks.items.current = { data: { items: [item, item2], pagination: { total: 2 } }, isLoading: false }; mocks.low.current = []; mocks.transactions.current = [];
    const { rerender } = render(<InventoryPage />); expect(screen.getByText("Central")).toBeTruthy(); expect(screen.getByText("Unknown branch")).toBeTruthy(); expect(screen.getByText("No stock changes recorded yet")).toBeTruthy();
    mocks.items.current = { data: { items: [], pagination: { total: 0 } }, isLoading: false }; act(() => useAuthStore.setState({ branchId: "b1" })); rerender(<InventoryPage />); expect(screen.getByText("No inventory items")).toBeTruthy();
  });
});
