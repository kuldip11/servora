import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn(), staff: { current: {} as any }, roles: { current: [] as any[] }, branches: { current: [] as any[] },
  add: vi.fn(), del: vi.fn(), status: vi.fn(), update: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/staff/hooks/useStaff", () => ({ useStaff: vi.fn(() => mocks.staff.current) }));
vi.mock("@/features/staff/hooks/useRoles", () => ({ useRoles: () => ({ data: mocks.roles.current }) }));
vi.mock("@/features/branches/hooks/useBranches", () => ({ useBranches: () => ({ data: mocks.branches.current }) }));
vi.mock("@/features/staff/hooks/useAddStaff", () => ({ useAddStaff: () => ({ mutate: mocks.add, isPending: false }) }));
vi.mock("@/features/staff/hooks/useDeleteStaff", () => ({ useDeleteStaff: () => ({ mutate: mocks.del }) }));
vi.mock("@/features/staff/hooks/useUpdateStaffStatus", () => ({ useUpdateStaffStatus: () => ({ mutate: mocks.status }) }));
vi.mock("@tanstack/react-query", () => ({ useMutation: (options: any) => ({ isPending: false, mutate: async (value: any) => { try { const result = await options.mutationFn(value); options.onSuccess?.(result); } catch (e) { options.onError?.(e); } } }) }));
vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: mocks.invalidate } }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.success, notifyError: mocks.error }));
vi.mock("@/features/staff/services/staff.service", () => ({ staffService: { update: mocks.update } }));
vi.mock("@/features/staff/query-keys", () => ({ staffKeys: { list: () => ["staff"] } }));
vi.mock("@/features/staff/components/forms/AddStaffForm", () => ({ AddStaffForm: ({ onSubmit, onCancel }: any) => <div><button onClick={() => onSubmit({ firstName: "New" })}>submit-add</button><button onClick={onCancel}>cancel-add</button></div> }));
vi.mock("@/features/staff/components/forms/EditStaffForm", () => ({ EditStaffForm: ({ onSubmit, onCancel }: any) => <div><button onClick={() => onSubmit({ firstName: "Edit", lastName: "User", roleId: "r1", branchIds: ["b1"] })}>submit-edit</button><button onClick={onCancel}>cancel-edit</button></div> }));
vi.mock("@/features/staff/components/roles/RoleManager", () => ({ RoleManager: ({ canManage, canManagePermissions }: any) => <div>roles-manager-{String(canManage)}-{String(canManagePermissions)}</div> }));
vi.mock("lucide-react", () => ({ Plus: () => null, Users: () => null, Trash2: () => null, UserCheck: () => null, UserX: () => null, Pencil: () => null }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>, Modal: ({ open, title, children, onClose }: any) => open ? <div role="dialog"><h2>{title}</h2><button onClick={onClose}>x</button>{children}</div> : null,
  IconButton: ({ "aria-label": label, onClick }: any) => <button aria-label={label} onClick={onClick}>{label}</button>,
  StatusBadge: ({ label }: any) => <span>{label}</span>, Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description, actions }: any) => <header><h1>{title}</h1><span>{description}</span>{actions}</header>,
  Pagination: ({ page, pageCount, onPageChange, onPageSizeChange }: any) => <div>page-{page}-of-{pageCount}<button onClick={() => onPageChange(2)}>next-page</button><button onClick={() => onPageSizeChange(50)}>size-50</button></div>,
  SearchInput: ({ value, onChange, onClear, ...props }: any) => <div><input value={value} onChange={onChange} {...props}/><button onClick={onClear}>clear-search</button></div>,
  SelectMenu: ({ value, onChange, ...props }: any) => <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-label={props["aria-label"]}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>,
  FilterBar: ({ children, onClearAll }: any) => <div>{children}{onClearAll ? <button onClick={onClearAll}>clear-all</button> : null}</div>,
  Table: ({ columns, data, emptyTitle, emptyAction }: any) => <div>{data.length ? data.map((row: any) => <div key={row.id}>{columns.map((c: any) => <span key={c.id}>{c.cell ? c.cell(row) : null}</span>)}</div>) : <div>{emptyTitle}{emptyAction}</div>}</div>,
}));

import { StaffPage } from "../StaffPage";

const active = { id: "s1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.com", status: "ACTIVE", assignedBranches: [{ name: "Central" }], roles: [{ name: "Manager" }] } as any;
const inactive = { id: "s2", firstName: "Linus", lastName: "Torvalds", email: "linus@x.com", status: "INACTIVE", assignedBranches: [], roles: [] } as any;

describe("StaffPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.has.mockReturnValue(true); mocks.roles.current = [{ id: "r1" }]; mocks.branches.current = [{ id: "b1" }];
    mocks.staff.current = { data: { items: [active, inactive], pagination: { total: 52 } }, isLoading: false };
    mocks.update.mockResolvedValue({}); vi.stubGlobal("confirm", vi.fn(() => true));
  });
  it("renders staff actions, filters and pagination", async () => {
    render(<StaffPage />);
    expect(screen.getByText("52 team members")).toBeTruthy(); expect(screen.getByText("Ada Lovelace")).toBeTruthy(); expect(screen.getByText("—")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Deactivate")); expect(mocks.status).toHaveBeenCalledWith({ id: "s1", status: "INACTIVE" });
    fireEvent.click(screen.getByLabelText("Activate")); expect(mocks.status).toHaveBeenCalledWith({ id: "s2", status: "ACTIVE" });
    fireEvent.click(screen.getAllByLabelText("Remove staff member")[0]!); expect(mocks.del).toHaveBeenCalledWith("s1");
    fireEvent.change(screen.getByLabelText("Search staff"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Filter staff by status"), { target: { value: "ACTIVE" } });
    expect(screen.getByRole("button", { name: "clear-all" })).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "clear-all" }));
    fireEvent.click(screen.getByRole("button", { name: "next-page" })); fireEvent.click(screen.getByRole("button", { name: "size-50" }));
  });
  it("adds and edits staff and handles update success/error", async () => {
    render(<StaffPage />); fireEvent.click(screen.getAllByRole("button", { name: /Add Staff/ })[0]!); expect(screen.getByRole("heading", { name: "Add Staff Member" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "submit-add" })); expect(mocks.add).toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText("Edit staff member")[0]!); fireEvent.click(screen.getByRole("button", { name: "submit-edit" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("s1", expect.objectContaining({ firstName: "Edit" }))); expect(mocks.success).toHaveBeenCalledWith("Staff member updated"); expect(mocks.invalidate).toHaveBeenCalled();
    mocks.update.mockRejectedValueOnce(new Error("bad")); fireEvent.click(screen.getAllByLabelText("Edit staff member")[0]!); fireEvent.click(screen.getByRole("button", { name: "submit-edit" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.any(Error), "Failed to update staff"));
  });
  it("covers roles tab, empty team and restricted permissions", () => {
    mocks.has.mockImplementation((p: string) => p === "roles:create"); mocks.staff.current = { data: { items: [], pagination: { total: 0 } }, isLoading: false };
    const { rerender } = render(<StaffPage />); expect(screen.getByText("No staff members")).toBeTruthy(); expect(screen.queryByRole("button", { name: /Add Staff/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Roles & permissions" })); expect(screen.getByText("roles-manager-true-false")).toBeTruthy();
    mocks.has.mockReturnValue(false); rerender(<StaffPage />); expect(screen.queryByLabelText("Edit staff member")).toBeNull();
  });
});
