import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from "@tanstack/react-router";
import { lazy, Suspense, type ComponentType } from "react";
import { Spinner } from "@pos/ui";
import { RootLayout } from "@/shared/components/layout/RootLayout";
import { DashboardLayout } from "@/shared/components/layout/DashboardLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { ForbiddenPage } from "@/features/auth/pages/ForbiddenPage";
import { userHasPermission } from "@/shared/auth/permissions";
import { getAuthorizedHomePath } from "@/shared/auth/default-route";
import { useAuthStore } from "@/store/auth";

const lazyPage = (
  loader: () => Promise<{ default: ComponentType<Record<string, never>> }>,
) => {
  const LazyComponent = lazy(loader);
  return function LazyPageWrapper() {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center p-16">
            <Spinner className="h-8 w-8" />
          </div>
        }
      >
        <LazyComponent />
      </Suspense>
    );
  };
};

const rootRoute = createRootRoute({ component: RootLayout });

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth",
  beforeLoad: () => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      throw redirect({ to: getAuthorizedHomePath(state.user) });
    }
  },
});

const loginRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "/login",
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "/signup",
  component: SignupPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  beforeLoad: ({ location }) => {
    const { isAuthenticated, franchiseId } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (!franchiseId && location.pathname !== "/business") {
      throw redirect({ to: "/business" });
    }
  },
  component: DashboardLayout,
});

const forbiddenRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/forbidden",
  component: ForbiddenPage,
});

const requirePermission = (permission: string) => {
  return () => {
    const state = useAuthStore.getState();
    if (!userHasPermission(state.user, permission))
      throw redirect({ to: "/forbidden" });
  };
};

const contextRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/context",
  beforeLoad: () => {
    throw redirect({ to: "/business" });
  },
});

const businessRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/business",
  component: lazyPage(() =>
    import("../features/business/pages/BusinessPage").then((m) => ({
      default: m.BusinessPage,
    })),
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  beforeLoad: requirePermission("analytics:read"),
  component: lazyPage(() =>
    import("../features/analytics/pages/DashboardPage").then((m) => ({
      default: m.DashboardPage,
    })),
  ),
});

const menuEngineeringRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/menu-engineering",
  beforeLoad: requirePermission("analytics:read"),
  component: lazyPage(() =>
    import("../features/analytics/pages/MenuEngineeringPage").then((m) => ({
      default: m.MenuEngineeringPage,
    })),
  ),
});

const ordersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/orders",
  beforeLoad: requirePermission("orders:read"),
  component: lazyPage(() =>
    import("../features/orders/pages/OrdersPage").then((m) => ({
      default: m.OrdersPage,
    })),
  ),
});

const orderDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/orders/$orderId",
  beforeLoad: requirePermission("orders:read"),
  component: lazyPage(() =>
    import("../features/orders/pages/OrderDetailPage").then((m) => ({
      default: m.OrderDetailPage,
    })),
  ),
});

const menuRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/menu",
  beforeLoad: requirePermission("menu:read"),
  component: lazyPage(() =>
    import("../features/menu/pages/MenuPage").then((m) => ({
      default: m.MenuPage,
    })),
  ),
});

const availabilityDashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/availability",
  beforeLoad: requirePermission("menu:read"),
  component: lazyPage(() =>
    import("../features/availability/pages/AvailabilityDashboardPage").then(
      (m) => ({
        default: m.AvailabilityDashboardPage,
      }),
    ),
  ),
});

const tablesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/tables",
  beforeLoad: requirePermission("tables:read"),
  component: lazyPage(() =>
    import("../features/tables/pages/TablesPage").then((m) => ({
      default: m.TablesPage,
    })),
  ),
});

const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/inventory",
  beforeLoad: requirePermission("inventory:read"),
  component: lazyPage(() =>
    import("../features/inventory/pages/InventoryPage").then((m) => ({
      default: m.InventoryPage,
    })),
  ),
});

const staffRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/staff",
  beforeLoad: requirePermission("staff:read"),
  component: lazyPage(() =>
    import("../features/staff/pages/StaffPage").then((m) => ({
      default: m.StaffPage,
    })),
  ),
});

const billingRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/billing",
  beforeLoad: requirePermission("billing:read"),
  component: lazyPage(() =>
    import("../features/billing/pages/BillingPage").then((m) => ({
      default: m.BillingPage,
    })),
  ),
});

const auditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/audit",
  beforeLoad: requirePermission("audit:read"),
  component: lazyPage(() =>
    import("../features/audit/pages/AuditLogPage").then((m) => ({
      default: m.AuditLogPage,
    })),
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings",
  component: lazyPage(() =>
    import("../features/settings/pages/SettingsPage").then((m) => ({
      default: m.SettingsPage,
    })),
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/profile",
  component: lazyPage(() =>
    import("../features/profile/pages/ProfilePage").then((m) => ({
      default: m.ProfilePage,
    })),
  ),
});

const branchesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/branches",
  beforeLoad: () => {
    throw redirect({ to: "/business" });
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const { isAuthenticated, franchiseId, user } = useAuthStore.getState();
    throw redirect({
      to: !isAuthenticated
        ? "/login"
        : franchiseId
          ? getAuthorizedHomePath(user)
          : "/business",
    });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute.addChildren([loginRoute, signupRoute]),
  protectedRoute.addChildren([
    contextRoute,
    businessRoute,
    forbiddenRoute,
    dashboardRoute,
    menuEngineeringRoute,
    ordersRoute,
    orderDetailRoute,
    menuRoute,
    availabilityDashboardRoute,
    tablesRoute,
    inventoryRoute,
    staffRoute,
    billingRoute,
    auditRoute,
    settingsRoute,
    profileRoute,
    branchesRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
