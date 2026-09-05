import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard",
  has: vi.fn((_permission?: string) => true),
  state: {
    user: { firstName: "Ada", lastName: "Lovelace", roles: [{ name: "OWNER" }] },
    branchId: "b1",
    membershipId: "m1",
    memberships: [{ membershipId: "m1", branches: [{ id: "b1", tablesEnabled: false }] }],
  } as any,
}));

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div>outlet</div>,
  Link: ({ children, onClick, to }: any) => <a href={to} onClick={onClick}>{children}</a>,
  useRouterState: ({ select }: any) => select({ location: { pathname: mocks.pathname } }),
}));
vi.mock("@/store/auth", () => ({ useAuthStore: () => mocks.state }));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/shared/components/layout/BranchSwitcher", () => ({ BranchSwitcher: () => <div>branch-switcher</div> }));
vi.mock("@/shared/components/layout/TenantSwitcher", () => ({ TenantSwitcher: () => <div>tenant-switcher</div> }));
vi.mock("@/shared/components/layout/RealtimeNotifications", () => ({ RealtimeNotifications: () => <div>realtime</div> }));
vi.mock("@/shared/components/layout/UserMenu", () => ({ UserMenu: () => <div>user-menu</div> }));
vi.mock("@pos/ui", () => ({
  SkipLink: () => <a href="#main-content">skip</a>,
  Dialog: ({ open, title, children, onClose }: any) => open ? <div role="dialog"><h2>{title}</h2><button onClick={onClose}>close nav</button>{children}</div> : null,
}));

import { DashboardLayout } from "../DashboardLayout";

describe("DashboardLayout coverage", () => {
  beforeEach(() => {
    mocks.pathname = "/dashboard";
    mocks.has.mockReturnValue(true);
    mocks.state = {
      user: { firstName: "Ada", lastName: "Lovelace", roles: [{ name: "OWNER" }] },
      branchId: "b1",
      membershipId: "m1",
      memberships: [{ membershipId: "m1", branches: [{ id: "b1", tablesEnabled: false }] }],
    };
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
  });

  it("renders authorized navigation and hides tables for a disabled branch", () => {
    render(<DashboardLayout />);
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tables")).toBeNull();
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getByText("OWNER")).toBeTruthy();
    expect(screen.getByText("outlet")).toBeTruthy();
  });

  it("opens/closes mobile navigation and filters permission-protected items", () => {
    mocks.has.mockImplementation((permission?: string) => permission !== "audit:read");
    render(<DashboardLayout />);
    expect(screen.queryByText("Audit Log")).toBeNull();
    fireEvent.click(screen.getByLabelText("Open navigation"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Navigation")).toBeTruthy();
    fireEvent.click(screen.getByText("close nav"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows tables for all branches and falls back to Staff role", () => {
    mocks.state = {
      user: { firstName: "Sam", lastName: "", roles: [] },
      branchId: "all",
      membershipId: "m1",
      memberships: [{ membershipId: "m1", branches: [] }],
    };
    render(<DashboardLayout />);
    expect(screen.getAllByText("Tables").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Staff").length).toBeGreaterThan(0);
  });

  it("focuses main content after route changes", () => {
    const { rerender } = render(<DashboardLayout />);
    const main = document.getElementById("main-content")!;
    const focus = vi.spyOn(main, "focus");
    mocks.pathname = "/orders";
    rerender(<DashboardLayout />);
    expect(focus).toHaveBeenCalled();
  });
});
