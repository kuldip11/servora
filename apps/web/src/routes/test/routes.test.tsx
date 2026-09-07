import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: { isAuthenticated: false, franchiseId: null as string | null, user: { id: "u1" } as any },
  permission: vi.fn(), home: vi.fn(), redirect: vi.fn((value:any)=>({ redirect:value })), configs: [] as any[],
}));
vi.mock("@/store/auth", () => ({ useAuthStore: { getState: () => mocks.state } }));
vi.mock("@/shared/auth/permissions", () => ({ userHasPermission: mocks.permission }));
vi.mock("@/shared/auth/default-route", () => ({ getAuthorizedHomePath: mocks.home }));
vi.mock("@pos/ui", () => ({ Spinner: () => null }));

vi.mock("@/shared/components/layout/RootLayout", () => ({ RootLayout: () => <div>root</div> }));
vi.mock("@/shared/components/layout/DashboardLayout", () => ({ DashboardLayout: () => <div>layout</div> }));
vi.mock("@/features/auth/pages/LoginPage", () => ({ LoginPage: () => <div>login</div> }));
vi.mock("@/features/auth/pages/SignupPage", () => ({ SignupPage: () => <div>signup</div> }));
vi.mock("@/features/auth/pages/ForbiddenPage", () => ({ ForbiddenPage: () => <div>forbidden</div> }));
vi.mock("@/features/business/pages/BusinessPage", () => ({ BusinessPage: () => <div>business-page</div> }));
vi.mock("@/features/analytics/pages/DashboardPage", () => ({ DashboardPage: () => <div>dashboard-page</div> }));
vi.mock("@/features/analytics/pages/MenuEngineeringPage", () => ({ MenuEngineeringPage: () => <div>menu-engineering-page</div> }));
vi.mock("@/features/orders/pages/OrdersPage", () => ({ OrdersPage: () => <div>orders-page</div> }));
vi.mock("@/features/orders/pages/OrderDetailPage", () => ({ OrderDetailPage: () => <div>order-detail-page</div> }));
vi.mock("@/features/menu/pages/MenuPage", () => ({ MenuPage: () => <div>menu-page</div> }));
vi.mock("@/features/availability/pages/AvailabilityDashboardPage", () => ({ AvailabilityDashboardPage: () => <div>availability-page</div> }));
vi.mock("@/features/tables/pages/TablesPage", () => ({ TablesPage: () => <div>tables-page</div> }));
vi.mock("@/features/inventory/pages/InventoryPage", () => ({ InventoryPage: () => <div>inventory-page</div> }));
vi.mock("@/features/staff/pages/StaffPage", () => ({ StaffPage: () => <div>staff-page</div> }));
vi.mock("@/features/billing/pages/BillingPage", () => ({ BillingPage: () => <div>billing-page</div> }));
vi.mock("@/features/audit/pages/AuditLogPage", () => ({ AuditLogPage: () => <div>audit-page</div> }));
vi.mock("@/features/settings/pages/SettingsPage", () => ({ SettingsPage: () => <div>settings-page</div> }));
vi.mock("@/features/profile/pages/ProfilePage", () => ({ ProfilePage: () => <div>profile-page</div> }));

vi.mock("@tanstack/react-router", () => ({
  redirect: mocks.redirect,
  createRootRoute: (config:any) => ({ config, addChildren(children:any[]){ return { config, children }; } }),
  createRoute: (config:any) => { const route={ config, addChildren(children:any[]){ return { config, children }; } }; mocks.configs.push(route); return route; },
  createRouter: ({routeTree}:any) => ({ routeTree }),
}));

describe("web route guards", () => {
  beforeEach(() => { mocks.permission.mockReset(); mocks.home.mockReset().mockReturnValue("/dashboard"); mocks.redirect.mockClear(); });
  it("covers auth, protected, permission and legacy redirects", async () => {
    await import("../index");
    const config = (path:string) => mocks.configs.find((r:any)=>r.config.path===path || r.config.id===path)!.config;
    mocks.state = { isAuthenticated: true, franchiseId: "f1", user: { id:"u1" } }; expect(()=>config("auth").beforeLoad()).toThrow();
    mocks.state = { isAuthenticated: false, franchiseId: null, user: { id:"u1" } }; expect(()=>config("protected").beforeLoad({location:{pathname:"/orders"}})).toThrow();
    mocks.state = { isAuthenticated: true, franchiseId: null, user: { id:"u1" } }; expect(()=>config("protected").beforeLoad({location:{pathname:"/business"}})).not.toThrow(); expect(()=>config("protected").beforeLoad({location:{pathname:"/orders"}})).toThrow();
    mocks.state = { isAuthenticated: true, franchiseId: "f1", user: { id:"u1" } }; mocks.permission.mockReturnValue(false); expect(()=>config("/orders").beforeLoad()).toThrow(); mocks.permission.mockReturnValue(true); expect(()=>config("/orders").beforeLoad()).not.toThrow();
    expect(()=>config("/context").beforeLoad()).toThrow(); expect(()=>config("/branches").beforeLoad()).toThrow();
  });
  it("covers index route destinations", async () => {
    await import("../index"); const index=mocks.configs.find((r:any)=>r.config.path==="/")!.config;
    mocks.state={isAuthenticated:false,franchiseId:null,user:{id:"u1"}}; expect(()=>index.beforeLoad()).toThrow(); expect(mocks.redirect).toHaveBeenLastCalledWith({to:"/login"});
    mocks.state={isAuthenticated:true,franchiseId:null,user:{id:"u1"}}; expect(()=>index.beforeLoad()).toThrow(); expect(mocks.redirect).toHaveBeenLastCalledWith({to:"/business"});
    mocks.state={isAuthenticated:true,franchiseId:"f1",user:{id:"u1"}}; expect(()=>index.beforeLoad()).toThrow(); expect(mocks.redirect).toHaveBeenLastCalledWith({to:"/dashboard"});
  });
  it("loads every lazy route component", async () => {
    await import("../index");
    for (const route of mocks.configs) route.config.getParentRoute?.();
    mocks.state = { isAuthenticated: true, franchiseId: "f1", user: { id: "u1" } };
    mocks.permission.mockReturnValue(true);
    for (const path of ["/dashboard","/menu-engineering","/orders","/orders/$orderId","/menu","/availability","/tables","/inventory","/staff","/billing","/audit"]) {
      expect(() => mocks.configs.find((r:any)=>r.config.path===path)!.config.beforeLoad()).not.toThrow();
    }
    const pages = [
      ["/business", "business-page"], ["/dashboard", "dashboard-page"], ["/menu-engineering", "menu-engineering-page"],
      ["/orders", "orders-page"], ["/orders/$orderId", "order-detail-page"], ["/menu", "menu-page"],
      ["/availability", "availability-page"], ["/tables", "tables-page"], ["/inventory", "inventory-page"],
      ["/staff", "staff-page"], ["/billing", "billing-page"], ["/audit", "audit-page"], ["/settings", "settings-page"], ["/profile", "profile-page"],
    ] as const;
    for (const [path, text] of pages) {
      const route = mocks.configs.find((r:any) => r.config.path === path)!;
      const Component = route.config.component;
      const view = render(<Component />);
      expect(await screen.findByText(text)).toBeTruthy();
      view.unmount();
    }
  });

});
