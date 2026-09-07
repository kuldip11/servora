import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn(), reasons: vi.fn(), create: vi.fn(), update: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("@/store/auth", () => ({ useAuthStore: mocks.auth }));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/orders/hooks/useCancellationReasons", () => ({ useCancellationReasons: mocks.reasons, cancellationReasonKeys: { all: ["reasons"], active: ["reasons", "active"] } }));
vi.mock("@/features/orders/services/cancellation-reasons.service", () => ({ cancellationReasonsService: { create: mocks.create, update: mocks.update } }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.success, notifyError: mocks.error }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useMutation: (options: any) => ({ isPending: false, mutate: async (value: any) => { try { const r = await options.mutationFn(value); options.onSuccess?.(r); } catch (error) { options.onError?.(error); } } }),
}));
vi.mock("@/features/settings/components/PricingSettingsCard", () => ({ PricingSettingsCard: ({ tenantId }: any) => <div>pricing-{tenantId}</div> }));
vi.mock("@/features/settings/components/KitchenOperationsSettingsCard", () => ({ KitchenOperationsSettingsCard: ({ tenantId }: any) => <div>kitchen-{tenantId}</div> }));
vi.mock("@/features/settings/components/ApprovalThresholdSettingsCard", () => ({ ApprovalThresholdSettingsCard: () => <div>approval-card</div> }));
vi.mock("lucide-react", () => ({ Building2: () => null, Shield: () => null, Palette: () => null }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Grid: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Input: ({ label, ...props }: any) => <label>{label}<input aria-label={label} {...props}/></label>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => <header><h1>{title}</h1><p>{description}</p></header>,
  StatusBadge: ({ label }: any) => <span>{label}</span>,
  ThemeSwitcher: ({ label }: any) => <div>{label}</div>,
}));

import { SettingsPage } from "../SettingsPage";

const permissions = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, key: `perm:${i}` }));

describe("SettingsPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.has.mockReturnValue(true);
    mocks.auth.mockReturnValue({ user: { tenantId: "tenant-1234567890", branchId: "branch-123456789", roles: [{ permissions }] }, franchiseId: "fr1" });
    mocks.reasons.mockReturnValue({ data: [{ id: "r1", label: "Mistake", isActive: true }, { id: "r2", label: "Sold out", isActive: false }] });
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
  });

  it("renders permission-enabled settings and updates cancellation reasons", async () => {
    render(<SettingsPage />);
    expect(screen.getByText("pricing-fr1")).toBeTruthy();
    expect(screen.getByText("kitchen-fr1")).toBeTruthy();
    expect(screen.getByText("approval-card")).toBeTruthy();
    expect(screen.getByText("+2 more permissions")).toBeTruthy();
    expect(screen.getByText("tenant-12345…")).toBeTruthy();
    expect(screen.getByText("branch-12345")).toBeTruthy();

    fireEvent.click(screen.getByText("Disable"));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("r1", { isActive: false }));
    fireEvent.click(screen.getByText("Enable"));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("r2", { isActive: true }));

    const add = screen.getByRole("button", { name: "Add" });
    expect(add).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("New reason"), { target: { value: "  Guest changed mind  " } });
    fireEvent.click(add);
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith("Guest changed mind"));
    expect(mocks.invalidate).toHaveBeenCalledTimes(6);
    expect(mocks.success).toHaveBeenCalledWith("Cancellation reasons updated");
  });

  it("handles mutation failure and restricted settings", async () => {
    mocks.create.mockRejectedValueOnce(new Error("bad"));
    const { unmount } = render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("New reason"), { target: { value: "Bad reason" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.any(Error), "Failed to update cancellation reasons"));
    unmount();

    mocks.has.mockReturnValue(false);
    mocks.auth.mockReturnValue({ user: { tenantId: "tenant", branchId: null, roles: [] }, franchiseId: null });
    mocks.reasons.mockReturnValue({ data: [] });
    render(<SettingsPage />);
    expect(screen.queryByText(/pricing-/)).toBeNull();
    expect(screen.queryByText("Cancellation reasons")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("Appearance")).toBeTruthy();
  });
});
