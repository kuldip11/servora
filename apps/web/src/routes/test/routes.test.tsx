import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {
    isAuthenticated: false,
    franchiseId: null as string | null,
    user: { id: "u1" } as any,
  },
  permission: vi.fn(),
  home: vi.fn(),
  redirect: vi.fn((value: any) => ({ redirect: value })),
  configs: [] as any[],
}));
vi.mock("@/store/auth", () => ({
  useAuthStore: { getState: () => mocks.state },
}));
vi.mock("@/shared/auth/permissions", () => ({
  userHasPermission: mocks.permission,
}));
vi.mock("@/shared/auth/default-route", () => ({
  getAuthorizedHomePath: mocks.home,
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Spinner: () => null,
}));

vi.mock("@/shared/components/layout/RootLayout", () => ({
  RootLayout: () => <div>root</div>,
}));
vi.mock("@/shared/components/layout/DashboardLayout", () => ({
  DashboardLayout: () => <div>layout</div>,
}));
vi.mock("@/features/auth", () => ({
  LoginPage: () => <div>login</div>,
  SignupPage: () => <div>signup</div>,
  ForbiddenPage: () => <div>forbidden</div>,
}));
vi.mock("@/features/business/public/pages", () => ({
  BusinessPage: () => <div>business-page</div>,
}));
vi.mock("@/features/analytics/public/pages", () => ({
  DashboardPage: () => <div>dashboard-page</div>,
  MenuEngineeringPage: () => <div>menu-engineering-page</div>,
}));
vi.mock("@/features/orders/public/pages", () => ({
  OrdersPage: () => <div>orders-page</div>,
  OrderDetailPage: () => <div>order-detail-page</div>,
}));
vi.mock("@/features/menu/public/pages", () => ({
  MenuPage: () => <div>menu-page</div>,
}));
vi.mock("@/features/availability/public/pages", () => ({
  AvailabilityDashboardPage: () => <div>availability-page</div>,
}));
vi.mock("@/features/tables/public/pages", () => ({
  TablesPage: () => <div>tables-page</div>,
}));
vi.mock("@/features/inventory/public/pages", () => ({
  InventoryPage: () => <div>inventory-page</div>,
}));
vi.mock("@/features/staff/public/pages", () => ({
  StaffPage: () => <div>staff-page</div>,
}));
vi.mock("@/features/billing/public/pages", () => ({
  BillingPage: () => <div>billing-page</div>,
}));
vi.mock("@/features/audit/public/pages", () => ({
  AuditLogPage: () => <div>audit-page</div>,
}));
vi.mock("@/features/settings/public/pages", () => ({
  SettingsPage: () => <div>settings-page</div>,
}));
vi.mock("@/features/profile/public/pages", () => ({
  ProfilePage: () => <div>profile-page</div>,
}));

vi.mock("@tanstack/react-router", () => ({
  redirect: mocks.redirect,
  createRootRoute: (config: any) => ({
    config,
    addChildren(children: any[]) {
      return { config, children };
    },
  }),
  createRoute: (config: any) => {
    const route = {
      config,
      addChildren(children: any[]) {
        return { config, children };
      },
    };
    mocks.configs.push(route);
    return route;
  },
  createRouter: ({ routeTree }: any) => ({ routeTree }),
}));

describe("web route guards", () => {
  beforeEach(() => {
    mocks.permission.mockReset();
    mocks.home.mockReset().mockReturnValue("/dashboard");
    mocks.redirect.mockClear();
  });
  it("covers auth, protected, permission and legacy redirects", async () => {
    await import("../index");
    const config = (path: string) =>
      mocks.configs.find(
        (r: any) => r.config.path === path || r.config.id === path,
      )!.config;
    mocks.state = {
      isAuthenticated: true,
      franchiseId: "f1",
      user: { id: "u1" },
    };
    expect(() => config("auth").beforeLoad()).toThrow();
    mocks.state = {
      isAuthenticated: false,
      franchiseId: null,
      user: { id: "u1" },
    };
    expect(() =>
      config("protected").beforeLoad({ location: { pathname: "/orders" } }),
    ).toThrow();
    mocks.state = {
      isAuthenticated: true,
      franchiseId: null,
      user: { id: "u1" },
    };
    expect(() =>
      config("protected").beforeLoad({ location: { pathname: "/business" } }),
    ).not.toThrow();
    expect(() =>
      config("protected").beforeLoad({ location: { pathname: "/orders" } }),
    ).toThrow();
    mocks.state = {
      isAuthenticated: true,
      franchiseId: "f1",
      user: { id: "u1" },
    };
    mocks.permission.mockReturnValue(false);
    expect(() => config("/orders").beforeLoad()).toThrow();
    mocks.permission.mockReturnValue(true);
    expect(() => config("/orders").beforeLoad()).not.toThrow();
    expect(() => config("/context").beforeLoad()).toThrow();
    expect(() => config("/branches").beforeLoad()).toThrow();
  });
  it("covers index route destinations", async () => {
    await import("../index");
    const index = mocks.configs.find((r: any) => r.config.path === "/")!.config;
    mocks.state = {
      isAuthenticated: false,
      franchiseId: null,
      user: { id: "u1" },
    };
    expect(() => index.beforeLoad()).toThrow();
    expect(mocks.redirect).toHaveBeenLastCalledWith({ to: "/login" });
    mocks.state = {
      isAuthenticated: true,
      franchiseId: null,
      user: { id: "u1" },
    };
    expect(() => index.beforeLoad()).toThrow();
    expect(mocks.redirect).toHaveBeenLastCalledWith({ to: "/business" });
    mocks.state = {
      isAuthenticated: true,
      franchiseId: "f1",
      user: { id: "u1" },
    };
    expect(() => index.beforeLoad()).toThrow();
    expect(mocks.redirect).toHaveBeenLastCalledWith({ to: "/dashboard" });
  });
  it("loads every lazy route component", async () => {
    await import("../index");
    for (const route of mocks.configs) route.config.getParentRoute?.();
    mocks.state = {
      isAuthenticated: true,
      franchiseId: "f1",
      user: { id: "u1" },
    };
    mocks.permission.mockReturnValue(true);
    for (const path of [
      "/dashboard",
      "/menu-engineering",
      "/orders",
      "/orders/$orderId",
      "/menu",
      "/availability",
      "/tables",
      "/inventory",
      "/staff",
      "/billing",
      "/audit",
    ]) {
      expect(() =>
        mocks.configs
          .find((r: any) => r.config.path === path)!
          .config.beforeLoad(),
      ).not.toThrow();
    }
    const pages = [
      ["/business", "business-page"],
      ["/dashboard", "dashboard-page"],
      ["/menu-engineering", "menu-engineering-page"],
      ["/orders", "orders-page"],
      ["/orders/$orderId", "order-detail-page"],
      ["/menu", "menu-page"],
      ["/availability", "availability-page"],
      ["/tables", "tables-page"],
      ["/inventory", "inventory-page"],
      ["/staff", "staff-page"],
      ["/billing", "billing-page"],
      ["/audit", "audit-page"],
      ["/settings", "settings-page"],
      ["/profile", "profile-page"],
    ] as const;
    for (const [path, text] of pages) {
      const route = mocks.configs.find((r: any) => r.config.path === path)!;
      const Component = route.config.component;
      const view = render(<Component />);
      expect(await screen.findByText(text)).toBeTruthy();
      view.unmount();
    }
  });
});
