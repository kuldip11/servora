import {
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { getWaiterName, logout, logoutSession } from "@/features/auth";
import { useQueryClient } from "@tanstack/react-query";
import { clearWaiterQueries } from "@/shared/lib/query-lifecycle";
import { AppLayout } from "./AppLayout";
import { AuthBoundary } from "./AuthBoundary";
import { RouteFallback } from "./RouteFallback";

const HomePage = lazy(() =>
  import("@/features/home/public/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const OrdersPage = lazy(() =>
  import("@/features/orders/public/OrdersPage").then((module) => ({
    default: module.OrdersPage,
  })),
);
const MenuPage = lazy(() =>
  import("@/features/menu/public/MenuPage").then((module) => ({
    default: module.MenuPage,
  })),
);
const OrderDetailPage = lazy(() =>
  import("@/features/orders/public/OrderDetailPage").then((module) => ({
    default: module.OrderDetailPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/public/ProfilePage").then((module) => ({
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
  component: function HomeRouteComponent() {
    const navigate = useNavigate();
    return (
      <AppLayout>
        {withSuspense(
          <HomePage
            onNewOrder={() => void navigate({ to: "/menu" })}
            onViewOrders={() => void navigate({ to: "/orders" })}
            onSelectOrder={(orderId) =>
              void navigate({ to: "/orders/$orderId", params: { orderId } })
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
  component: function MenuRouteComponent() {
    const navigate = useNavigate();
    return (
      <AppLayout>
        {withSuspense(
          <MenuPage
            onBack={() => void navigate({ to: "/" })}
            onOrderPlaced={(orderId) =>
              void navigate({
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
  component: function OrdersRouteComponent() {
    const navigate = useNavigate();
    return (
      <AppLayout>
        {withSuspense(
          <OrdersPage
            onSelectOrder={(orderId) =>
              void navigate({ to: "/orders/$orderId", params: { orderId } })
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
  component: function OrderDetailRouteComponent() {
    const navigate = useNavigate();
    const { orderId } = orderDetailRoute.useParams();
    return withSuspense(
      <OrderDetailPage
        orderId={orderId}
        onBack={() => void navigate({ to: "/orders" })}
        onAddItems={(id) =>
          void navigate({ to: "/orders/$orderId/add", params: { orderId: id } })
        }
      />,
    );
  },
});

const addItemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders/$orderId/add",
  component: function AddItemsRouteComponent() {
    const navigate = useNavigate();
    const { orderId } = addItemsRoute.useParams();
    return withSuspense(
      <MenuPage
        existingOrderId={orderId}
        onBack={() =>
          void navigate({ to: "/orders/$orderId", params: { orderId } })
        }
        onOrderPlaced={(id) =>
          void navigate({
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
  component: function ProfileRouteComponent() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    return withSuspense(
      <ProfilePage
        waiterName={getWaiterName()}
        onBack={() => void navigate({ to: "/" })}
        onLogout={async () => {
          try {
            await logoutSession();
          } finally {
            await clearWaiterQueries(queryClient);
            logout();
            void navigate({ to: "/" });
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
