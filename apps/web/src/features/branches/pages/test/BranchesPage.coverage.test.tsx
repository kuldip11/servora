import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn(), branches: vi.fn(), add: vi.fn(), update: vi.fn(), deactivate: vi.fn(),
}));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/branches/hooks/useBranches", () => ({ useBranches: mocks.branches }));
vi.mock("@/features/branches/hooks/useCreateBranch", () => ({ useCreateBranch: () => ({ mutate: mocks.add, isPending: false }) }));
vi.mock("@/features/branches/hooks/useUpdateBranch", () => ({ useUpdateBranch: () => ({ mutate: mocks.update, isPending: false }) }));
vi.mock("@/features/branches/hooks/useDeactivateBranch", () => ({ useDeactivateBranch: () => ({ mutate: mocks.deactivate }) }));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("@pos/validation", () => ({ branchFormSchema: {} }));
vi.mock("lucide-react", () => ({ Plus: () => null, Building2: () => null }));
vi.mock("@/features/branches/components/BranchCard", () => ({
  BranchCard: ({ branch, onEdit, onDeactivate }: any) => <div><span>{branch.name}</span><button onClick={() => onEdit(branch)}>edit-{branch.id}</button><button onClick={() => onDeactivate(branch)}>deactivate-{branch.id}</button></div>,
}));
vi.mock("@/features/branches/components/BranchFormModal", () => ({
  BranchFormModal: ({ mode, open, onClose, onSubmit }: any) => open ? <div data-testid={`${mode}-modal`}><button onClick={() => onSubmit({ name: `${mode} branch`, code: "B1", timezone: "Asia/Kolkata", currency: "INR", address: "", phone: "", dineInEnabled: true, takeawayEnabled: true, deliveryEnabled: true, onlineEnabled: true, tablesEnabled: true })}>submit-{mode}</button><button onClick={onClose}>close-{mode}</button></div> : null,
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  EmptyState: ({ title, description, action }: any) => <div><span>{title}</span><span>{description}</span>{action}</div>,
  Grid: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description, actions }: any) => <header><h1>{title}</h1><p>{description}</p>{actions}</header>,
}));

import { BranchesPage } from "../BranchesPage";

const branch = { id: "b1", name: "Central", code: "CEN", timezone: "Asia/Kolkata", currency: "INR", address: null, phone: null, dineInEnabled: true, takeawayEnabled: false, deliveryEnabled: true, onlineEnabled: true, tablesEnabled: true } as any;

describe("BranchesPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.has.mockReturnValue(true);
    mocks.branches.mockReturnValue({ data: [branch], isLoading: false });
    mocks.add.mockImplementation((_values, options) => options?.onSuccess?.());
    mocks.update.mockImplementation((_values, options) => options?.onSuccess?.());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders loading and permission-aware empty states", () => {
    mocks.branches.mockReturnValue({ data: undefined, isLoading: true });
    const { unmount } = render(<BranchesPage />);
    expect(document.querySelectorAll(".animate-pulse").length).toBe(3);
    unmount();

    mocks.has.mockReturnValue(false);
    mocks.branches.mockReturnValue({ data: [], isLoading: false });
    render(<BranchesPage />);
    expect(screen.getByText("No branches yet")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Add Branch/ })).toHaveLength(1);
  });

  it("adds, edits and deactivates branches", async () => {
    render(<BranchesPage />);
    expect(screen.getByText("1 branch — each has its own menu, tables, staff, and orders")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Add Branch/ }));
    fireEvent.click(screen.getByText("submit-add"));
    await waitFor(() => expect(mocks.add).toHaveBeenCalled());

    fireEvent.click(screen.getByText("edit-b1"));
    expect(screen.getByTestId("edit-modal")).toBeTruthy();
    fireEvent.click(screen.getByText("submit-edit"));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: "b1" }), expect.any(Object)));

    fireEvent.click(screen.getByText("deactivate-b1"));
    expect(mocks.deactivate).toHaveBeenCalledWith("b1");
  });

  it("cancels dialogs and respects rejected deactivation confirmation", () => {
    render(<BranchesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Add Branch/ }));
    fireEvent.click(screen.getByText("close-add"));
    expect(screen.queryByTestId("add-modal")).toBeNull();

    fireEvent.click(screen.getByText("edit-b1"));
    fireEvent.click(screen.getByText("close-edit"));
    expect(screen.queryByTestId("edit-modal")).toBeNull();

    vi.mocked(confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByText("deactivate-b1"));
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });
});
