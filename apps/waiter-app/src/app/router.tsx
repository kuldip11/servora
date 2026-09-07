import {
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { getWaiterName, logout, logoutSession } from "@/features/auth";
import { AppLayout } from "./AppLayout";
import { AuthBoundary } from "./AuthBoundary";
import { RouteFallback } from "./RouteFallback";

const HomePage = lazy(() =>
  import("@/features/home/pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const OrdersPage = lazy(() =>
  import("@/features/orders/pages/OrdersPage").then((module) => ({
    default: module.OrdersPage,
  })),
);
const MenuPage = lazy(() =>
  import("@/features/menu").then((module) => ({ default: module.MenuPage })),
);
const OrderDetailPage = lazy(() =>
  import("@/features/orders/pages/OrderDetailPage").then((module) => ({
    default: module.OrderDetailPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);

const withSuspense = (content: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{content}</Suspense>
);

const rootRoute = createRootRoute({
  component: AuthBoundary,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => {
    const navigate = useNavigate();
    return (
      <AppLayout>
        {withSuspense(
          <HomePage
            onNewOrder={() => navigate({ to: "/menu" })}
            onViewOrders={() => navigate({ to: "/orders" })}
            onSelectOrder={(orderId) =>
              navigate({ to: "/orders/$orderId", params: { orderId } })
            }
          />,
        )}
      </AppLayout>
    );
  },
});

const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/menu",
  component: () => {
    const navigate = useNavigate();
    return (
      <AppLayout>
        {withSuspense(
          <MenuPage
            onBack={() => navigate({ to: "/" })}
            onOrderPlaced={(orderId) =>
              navigate({
                to: "/orders/$orderId",
                params: { orderId },
                replace: true,
              })
            }
          />,
        )}
      </AppLayout>
    );
  },
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders",
  component: () => {
    const navigate = useNavigate();
    return (
      <AppLayout>
        {withSuspense(
          <OrdersPage
            onSelectOrder={(orderId) =>
              navigate({ to: "/orders/$orderId", params: { orderId } })
            }
          />,
        )}
      </AppLayout>
    );
  },
});

const orderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders/$orderId",
  component: () => {
    const navigate = useNavigate();
    const { orderId } = orderDetailRoute.useParams();
    return withSuspense(
      <OrderDetailPage
        orderId={orderId}
        onBack={() => navigate({ to: "/orders" })}
        onAddItems={(id) =>
          navigate({ to: "/orders/$orderId/add", params: { orderId: id } })
        }
      />,
    );
  },
});

const addItemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders/$orderId/add",
  component: () => {
    const navigate = useNavigate();
    const { orderId } = addItemsRoute.useParams();
    return withSuspense(
      <MenuPage
        existingOrderId={orderId}
        onBack={() => navigate({ to: "/orders/$orderId", params: { orderId } })}
        onOrderPlaced={(id) =>
          navigate({
            to: "/orders/$orderId",
            params: { orderId: id },
            replace: true,
          })
        }
      />,
    );
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => {
    const navigate = useNavigate();
    return withSuspense(
      <ProfilePage
        waiterName={getWaiterName()}
        onBack={() => navigate({ to: "/" })}
        onLogout={async () => {
          try {
            await logoutSession();
          } finally {
            logout();
            navigate({ to: "/" });
            window.location.reload();
          }
        }}
      />,
    );
  },
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  menuRoute,
  ordersRoute,
  orderDetailRoute,
  addItemsRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
