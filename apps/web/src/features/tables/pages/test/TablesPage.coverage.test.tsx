import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn(), tables: { current: {} as any }, branches: { current: [] as any[] }, orders: { current: [] as any[] }, add: vi.fn(), update: vi.fn(), status: vi.fn(), del: vi.fn(), regen: vi.fn(), transfer: vi.fn(), merge: vi.fn(), getTakeaway: vi.fn(), regenTakeaway: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/branches/hooks/useBranches", () => ({ useBranches: () => ({ data: mocks.branches.current }) }));
vi.mock("@/features/tables/hooks/useTables", () => ({ useTables: () => mocks.tables.current }));
vi.mock("@/features/tables/hooks/useTablesRealtimeSync", () => ({ useTablesRealtimeSync: vi.fn() }));
vi.mock("@/features/tables/hooks/useCreateTable", () => ({ useCreateTable: () => ({ mutate: mocks.add, isPending: false }) }));
vi.mock("@/features/tables/hooks/useUpdateTable", () => ({ useUpdateTable: () => ({ mutate: mocks.update, isPending: false }) }));
vi.mock("@/features/tables/hooks/useUpdateTableStatus", () => ({ useUpdateTableStatus: () => ({ mutate: mocks.status }) }));
vi.mock("@/features/tables/hooks/useDeleteTable", () => ({ useDeleteTable: () => ({ mutate: mocks.del }) }));
vi.mock("@/features/tables/hooks/useRegenerateTableQr", () => ({ useRegenerateTableQr: () => ({ mutate: mocks.regen, isPending: false }) }));
vi.mock("@/features/orders/hooks/useOrders", () => ({ useOrders: () => ({ data: mocks.orders.current }) }));
vi.mock("@/features/orders/hooks/useTransferTable", () => ({ useTransferTable: () => ({ mutate: mocks.transfer, isPending: false }) }));
vi.mock("@pos/api-client", () => ({ createTablesApi: () => ({ getTakeawayQr: mocks.getTakeaway, regenerateTakeawayQr: mocks.regenTakeaway }) }));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/features/orders/services/orders.service", () => ({ ordersService: { mergeOrders: mocks.merge } }));
vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: mocks.invalidate } }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.success, notifyError: mocks.error }));
vi.mock("@tanstack/react-query", () => ({ useMutation: (options: any) => ({ isPending: false, mutate: async (value: any) => { try { const out = await options.mutationFn(value); options.onSuccess?.(out); } catch (e) { options.onError?.(e); } } }) }));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("qrcode.react", () => ({ QRCodeSVG: ({ value }: any) => <div>qr-{value}</div> }));
vi.mock("lucide-react", () => ({ Plus: () => null, Table2: () => null, Users: () => null, Edit2: () => null, Trash2: () => null, MapPin: () => null, Building2: () => null, QrCode: () => null }));
vi.mock("@/features/tables/components/TableFormModal", () => ({ TableFormModal: ({ open, mode, onSubmit, onClose }: any) => open ? <div role="dialog"><h2>{mode}-table</h2><button onClick={() => onSubmit({ name: "T9", capacity: "4", section: "Hall", branchId: "b1" })}>submit-{mode}</button><button onClick={onClose}>close-{mode}</button></div> : null }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>, Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>, EmptyState: ({ title, action }: any) => <div>{title}{action}</div>, Grid: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  IconButton: ({ "aria-label": label, onClick, disabled }: any) => <button aria-label={label} onClick={onClick} disabled={disabled}>{label}</button>, Input: ({ label, ...props }: any) => <label>{label}<input aria-label={label} {...props}/></label>,
  Modal: ({ open, title, children, onClose, footer }: any) => open ? <div role="dialog"><h2>{title}</h2><button onClick={onClose}>modal-x</button>{children}{footer}</div> : null, Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>, PageHeader: ({ title, description, actions }: any) => <header><h1>{title}</h1><span>{description}</span>{actions}</header>,
  Select: ({ options = [], value, onChange, ...props }: any) => <select aria-label={props["aria-label"] ?? `status-${value}`} value={value} onChange={onChange} disabled={props.disabled}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>,
  SelectMenu: ({ value, onChange, ...props }: any) => <select aria-label={props["aria-label"]} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">All</option><option value="Hall">Hall</option><option value="Patio">Patio</option></select>, SearchInput: ({ value, onChange, onClear, ...props }: any) => <div><input value={value} onChange={onChange} {...props}/><button onClick={onClear}>clear-search</button></div>, FilterBar: ({ children, onClearAll }: any) => <div>{children}{onClearAll ? <button onClick={onClearAll}>clear-all</button> : null}</div>, StatusBadge: ({ label }: any) => <span>{label}</span>,
}));

import { useAuthStore } from "@/store/auth";
import { TablesPage } from "../TablesPage";

const t1 = { id: "t1", branchId: "b1", name: "A1", capacity: 4, section: "Hall", status: "OCCUPIED", publicQrToken: "q1", branch: { name: "Central" } } as any;
const t2 = { id: "t2", branchId: "b1", name: "A2", capacity: 2, section: "Hall", status: "AVAILABLE", publicQrToken: "q2", branch: { name: "Central" } } as any;
const t3 = { id: "t3", branchId: "b2", name: "P1", capacity: 3, section: "Patio", status: "CLEANING", publicQrToken: "q3", branch: undefined } as any;

describe("TablesPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.has.mockReturnValue(true); useAuthStore.setState({ branchId: "b1" }); mocks.tables.current = { data: [t1, t2, t3], isLoading: false }; mocks.branches.current = [{ id: "b1", name: "Central" }]; mocks.orders.current = [{ id: "o1", tableId: "t1" }, { id: "o2", tableId: "t2" }];
    mocks.getTakeaway.mockResolvedValue({ branchId: "b1", branchName: "Central", enabled: true, token: "take1" }); mocks.regenTakeaway.mockResolvedValue({ branchId: "b1", branchName: "Central", enabled: true, token: "take2" }); mocks.merge.mockResolvedValue({}); vi.stubGlobal("confirm", vi.fn(() => true)); vi.stubGlobal("print", vi.fn());
  });
  it("filters tables and handles add/edit/status/delete and QR flows", async () => {
    render(<TablesPage />); expect(screen.getByText("3 of 3 tables")).toBeTruthy(); fireEvent.change(screen.getByLabelText("Search tables"), { target: { value: "A2" } }); expect(screen.getByText("1 of 3 tables")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: /Available 1/ }));
    fireEvent.change(screen.getByLabelText("Filter tables by section"), { target: { value: "Hall" } }); fireEvent.click(screen.getByRole("button", { name: "clear-all" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Table/ })); fireEvent.click(screen.getByRole("button", { name: "submit-add" })); expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ name: "T9", capacity: 4, section: "Hall" }), expect.any(Object));
    fireEvent.click(screen.getAllByLabelText("Edit table")[1]!); fireEvent.click(screen.getByRole("button", { name: "submit-edit" })); expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: "t2" }), expect.any(Object));
    fireEvent.change(screen.getByLabelText("status-AVAILABLE"), { target: { value: "CLEANING" } }); expect(mocks.status).toHaveBeenCalledWith({ id: "t2", status: "CLEANING" }); fireEvent.click(screen.getAllByLabelText("Remove table")[0]!); expect(mocks.del).toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText("Show table QR code")[1]!); expect(screen.getByRole("heading", { name: "A2 — Customer QR" })).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Regenerate" })); expect(mocks.regen).toHaveBeenCalledWith("t2", expect.any(Object)); fireEvent.click(screen.getByRole("button", { name: "Print QR" })); expect(window.print).toHaveBeenCalled();
  });
  it("loads takeaway QR and transfers/merges occupied tables", async () => {
    render(<TablesPage />); fireEvent.click(screen.getByRole("button", { name: /Takeaway QR/ })); expect(await screen.findByRole("heading", { name: "Central — Takeaway QR" })).toBeTruthy(); expect(screen.getByText(/qr-/)).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: /Regenerate/ })); await waitFor(() => expect(mocks.regenTakeaway).toHaveBeenCalledWith("b1"));
    fireEvent.click(screen.getByRole("button", { name: "Transfer" })); expect(screen.getByRole("heading", { name: "Transfer A1" })).toBeTruthy(); const selects = screen.getAllByRole("combobox"); fireEvent.change(selects.at(-1)!, { target: { value: "t2" } }); fireEvent.change(screen.getByLabelText("Reason (optional)"), { target: { value: "guest move" } }); fireEvent.click(screen.getAllByRole("button", { name: "Transfer" }).at(-1)!); expect(mocks.transfer).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o1", newTableId: "t2", reason: "guest move" }), expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: "Merge" })); expect(screen.getByRole("heading", { name: "Merge A1" })).toBeTruthy(); fireEvent.change(screen.getAllByRole("combobox").at(-1)!, { target: { value: "o2" } }); fireEvent.click(screen.getByRole("button", { name: "Merge tables" })); await waitFor(() => expect(mocks.merge).toHaveBeenCalledWith("o1", "o2")); expect(mocks.success).toHaveBeenCalledWith("Tables merged for billing");
  });
  it("covers aggregate grouping, loading and empty filtered states", () => {
    useAuthStore.setState({ branchId: "all" }); const { rerender } = render(<TablesPage />); expect(screen.getByText("Central")).toBeTruthy(); expect(screen.getByText("Unknown branch")).toBeTruthy(); expect(screen.queryByRole("button", { name: /Takeaway QR/ })).toBeNull();
    mocks.tables.current = { data: [], isLoading: true }; rerender(<TablesPage />); expect(screen.queryByText("No tables yet")).toBeNull(); mocks.tables.current = { data: [], isLoading: false }; rerender(<TablesPage />); expect(screen.getByText("No tables yet")).toBeTruthy();
  });
});
