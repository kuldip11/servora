import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), archive: vi.fn(), listPermissions: vi.fn(), forRole: vi.fn(), setForRole: vi.fn(),
  invalidate: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock("@/features/staff/services/roles.service", () => ({ rolesService: { create: mocks.create, archive: mocks.archive } }));
vi.mock("@/features/staff/services/permissions.service", () => ({ permissionsService: { list: mocks.listPermissions, forRole: mocks.forRole, setForRole: mocks.setForRole } }));
vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: mocks.invalidate } }));
vi.mock("@/features/staff/query-keys", () => ({ roleKeys: { list: () => ["roles"] } }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.success, notifyError: mocks.error }));
vi.mock("lucide-react", () => ({ KeyRound: () => null, Plus: () => null, Shield: () => null, Trash2: () => null }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => ({
    isPending: false,
    mutate: async (value: any) => {
      try { const result = await options.mutationFn(value); options.onSuccess?.(result); }
      catch (error) { options.onError?.(error); }
    },
  }),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Input: ({ label, ...props }: any) => <label>{label}<input aria-label={label} {...props}/></label>,
  Modal: ({ open, title, children, onClose }: any) => open ? <div role="dialog"><h2>{title}</h2><button onClick={onClose}>modal-close</button>{children}</div> : null,
  Select: ({ label, value, onChange, options }: any) => <label>{label}<select aria-label={label} value={value} onChange={onChange}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
  StatusBadge: ({ label }: any) => <span>{label}</span>,
}));

import { RoleManager } from "../RoleManager";

const systemRole = { id: "r1", name: "OWNER", description: "Owner", scope: "TENANT", isSystem: true } as any;
const customRole = { id: "r2", name: "Shift Lead", description: "Lead", scope: "BRANCH", isSystem: false } as any;

describe("RoleManager coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
    mocks.create.mockResolvedValue({});
    mocks.archive.mockResolvedValue({});
    mocks.setForRole.mockResolvedValue({});
    mocks.listPermissions.mockResolvedValue([
      { id: "p1", key: "orders:read", module: "orders", description: "Read orders" },
      { id: "p2", key: "orders:write", module: "orders", description: null },
      { id: "p3", key: "menu:read", module: "menu", description: "Read menu" },
    ]);
    mocks.forRole.mockResolvedValue([{ id: "p1" }]);
  });

  it("creates and archives custom roles while protecting system roles", async () => {
    render(<RoleManager roles={[systemRole, customRole]} canManage canManagePermissions />);
    expect(screen.getByText("OWNER")).toBeTruthy();
    expect(screen.getByText("SYSTEM")).toBeTruthy();
    expect(screen.queryByLabelText("Archive OWNER")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Create Role/ }));
    fireEvent.change(screen.getByLabelText("Role name"), { target: { value: "Cash Lead" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Cashier lead" } });
    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "TENANT" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Create Role/ }).at(-1)!);
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: "Cash Lead", description: "Cashier lead", scope: "TENANT" }));
    expect(mocks.success).toHaveBeenCalledWith("Role created");
    expect(mocks.invalidate).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Archive Shift Lead"));
    await waitFor(() => expect(mocks.archive).toHaveBeenCalledWith("r2"));
    expect(mocks.success).toHaveBeenCalledWith("Role archived");
  });

  it("loads, toggles and saves permissions", async () => {
    render(<RoleManager roles={[customRole]} canManage canManagePermissions />);
    fireEvent.click(screen.getByLabelText("Manage permissions for Shift Lead"));
    expect(screen.getByText("Loading permissions…")).toBeTruthy();
    await screen.findByText("orders:read");
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0]!.checked).toBe(true);
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Save Permissions" }));
    await waitFor(() => expect(mocks.setForRole).toHaveBeenCalledWith("r2", ["p2"]));
    expect(mocks.success).toHaveBeenCalledWith("Role permissions updated");
  });

  it("handles permission/create/archive/save failures and hidden controls", async () => {
    const { rerender } = render(<RoleManager roles={[customRole]} canManage={false} canManagePermissions={false} />);
    expect(screen.queryByRole("button", { name: /Create Role/ })).toBeNull();
    expect(screen.queryByLabelText("Archive Shift Lead")).toBeNull();
    expect(screen.queryByLabelText("Manage permissions for Shift Lead")).toBeNull();

    rerender(<RoleManager roles={[customRole]} canManage canManagePermissions />);
    mocks.listPermissions.mockRejectedValueOnce(new Error("load"));
    fireEvent.click(screen.getByLabelText("Manage permissions for Shift Lead"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.any(Error), "Failed to load permissions"));
    fireEvent.click(screen.getByText("Cancel"));

    mocks.create.mockRejectedValueOnce(new Error("create"));
    fireEvent.click(screen.getByRole("button", { name: /Create Role/ }));
    fireEvent.change(screen.getByLabelText("Role name"), { target: { value: "Bad" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Create Role/ }).at(-1)!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.any(Error), "Failed to create role"));
    fireEvent.click(screen.getByText("Cancel"));

    mocks.archive.mockRejectedValueOnce(new Error("archive"));
    fireEvent.click(screen.getByLabelText("Archive Shift Lead"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.any(Error), "Failed to archive role"));
  });
});
