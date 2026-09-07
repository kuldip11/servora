import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  routeConfigs: [] as any[],
  navigate: vi.fn(),
  pathname: "/",
  params: { orderId: "order-42" },
  token: null as string | null,
  waiterName: "Alex Kumar",
  restoreSession: vi.fn(),
  logout: vi.fn(),
  logoutSession: vi.fn(),
  attention: vi.fn(),
  connected: true,
  branch: { name: "Downtown" } as any,
}));

vi.mock("@tanstack/react-router", () => {
  const makeRoute = (config: any) => {
    const route: any = {
      config,
      useParams: () => mocks.params,
      addChildren: (children: any[]) => ({ ...route, children }),
    };
    mocks.routeConfigs.push(config);
    return route;
  };
  return {
    createRootRoute: (config: any) => makeRoute(config),
    createRoute: (config: any) => makeRoute(config),
    createRouter: ({ routeTree }: any) => ({ routeTree }),
    Outlet: () => <div>Outlet content</div>,
    useNavigate: () => mocks.navigate,
    useRouterState: ({ select }: any) =>
      select({ location: { pathname: mocks.pathname } }),
  };
});

vi.mock("lucide-react", () => ({
  Home: () => <span>HomeIcon</span>,
  ClipboardList: () => <span>OrdersIcon</span>,
  Plus: () => <span>PlusIcon</span>,
}));

vi.mock("@/features/auth", () => ({
  LoginPage: ({ onLogin }: any) => (
    <button onClick={onLogin}>Login mock</button>
  ),
  getToken: () => mocks.token,
  getWaiterName: () => mocks.waiterName,
  logout: mocks.logout,
  logoutSession: mocks.logoutSession,
  restoreSession: mocks.restoreSession,
}));

vi.mock("@/features/home/pages/HomePage", () => ({
  HomePage: ({ onNewOrder, onViewOrders, onSelectOrder }: any) => (
    <div>
      <button onClick={onNewOrder}>Home new order</button>
      <button onClick={onViewOrders}>Home view orders</button>
      <button onClick={() => onSelectOrder("o-home")}>Home select order</button>
    </div>
  ),
}));

vi.mock("@/features/orders/pages/OrdersPage", () => ({
  OrdersPage: ({ onSelectOrder }: any) => (
    <button onClick={() => onSelectOrder("o-list")}>Select list order</button>
  ),
}));

vi.mock("@/features/menu", () => ({
  MenuPage: ({ existingOrderId, onBack, onOrderPlaced }: any) => (
    <div>
      <span>Menu {existingOrderId ?? "new"}</span>
      <button onClick={onBack}>Menu back</button>
      <button onClick={() => onOrderPlaced("o-placed")}>
        Place menu order
      </button>
    </div>
  ),
}));

vi.mock("@/features/orders/pages/OrderDetailPage", () => ({
  OrderDetailPage: ({ orderId, onBack, onAddItems }: any) => (
    <div>
      <span>Detail {orderId}</span>
      <button onClick={onBack}>Detail back</button>
      <button onClick={() => onAddItems(orderId)}>Detail add items</button>
    </div>
  ),
}));

vi.mock("@/features/profile/pages/ProfilePage", () => ({
  ProfilePage: ({ waiterName, onBack, onLogout }: any) => (
    <div>
      <span>Profile {waiterName}</span>
      <button onClick={onBack}>Profile back</button>
      <button onClick={onLogout}>Profile logout</button>
    </div>
  ),
}));

vi.mock("@/features/orders/hooks/useWaiterAttention", () => ({
  useWaiterAttention: mocks.attention,
}));
vi.mock("@/shared/lib/realtime", () => ({
  useConnectionStatus: () => mocks.connected,
}));
vi.mock("@/features/menu/hooks/useMyBranch", () => ({
  useMyBranch: () => ({ data: mocks.branch }),
}));

import { router } from "./router";

const routeByPath = (path: string) =>
  mocks.routeConfigs.find((config) => config.path === path);
const rootConfig = () => mocks.routeConfigs.find((config) => !config.path);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
  mocks.params = { orderId: "order-42" };
  mocks.token = "token";
  mocks.waiterName = "Alex Kumar";
  mocks.connected = true;
  mocks.branch = { name: "Downtown" };
  mocks.restoreSession.mockResolvedValue(undefined);
  mocks.logoutSession.mockResolvedValue(undefined);
});

describe("waiter router coverage", () => {
  it("builds every application route", () => {
    expect(router).toBeTruthy();
    expect(
      [
        "/",
        "/menu",
        "/orders",
        "/orders/$orderId",
        "/orders/$orderId/add",
        "/profile",
      ].every((path) => routeByPath(path)),
    ).toBe(true);
  });

  it("renders authenticated layout status and navigates primary actions", () => {
    const Root = rootConfig().component;
    const { unmount } = render(<Root />);
    expect(screen.getByText("Outlet content")).toBeTruthy();
    unmount();

    const HomeRoute = routeByPath("/").component;
    render(<HomeRoute />);
    expect(screen.getByText(/Downtown/).textContent).toContain("Live");
    expect(screen.getByText("Alex Kumar's service")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open profile" }).textContent,
    ).toBe("AK");

    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
    fireEvent.click(screen.getByRole("button", { name: /HomeIcon Home/ }));
    fireEvent.click(screen.getByRole("button", { name: /OrdersIcon Orders/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create new order" }));
    fireEvent.click(screen.getByRole("button", { name: "Home new order" }));
    fireEvent.click(screen.getByRole("button", { name: "Home view orders" }));
    fireEvent.click(screen.getByRole("button", { name: "Home select order" }));

    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/profile" });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/orders" });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/menu" });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/orders/$orderId",
      params: { orderId: "o-home" },
    });
    expect(mocks.attention).toHaveBeenCalled();
  });

  it("covers restoring, failed restore, and interactive login", async () => {
    mocks.token = null;
    let resolveRestore!: () => void;
    mocks.restoreSession.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRestore = resolve;
      }),
    );
    const Root = rootConfig().component;
    const { unmount } = render(<Root />);
    expect(screen.getByText("Restoring session…")).toBeTruthy();
    resolveRestore();
    await waitFor(() =>
      expect(screen.getByText("Outlet content")).toBeTruthy(),
    );
    unmount();

    mocks.token = null;
    mocks.restoreSession.mockRejectedValueOnce(new Error("expired"));
    render(<Root />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Login mock" })).toBeTruthy(),
    );
    expect(mocks.logout).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Login mock" }));
    await waitFor(() =>
      expect(screen.getByText("Outlet content")).toBeTruthy(),
    );
  });

  it("covers disconnected/fallback header and route callback navigation", () => {
    mocks.connected = false;
    mocks.branch = undefined;
    mocks.waiterName = "";
    mocks.pathname = "/orders/42";

    const OrdersRoute = routeByPath("/orders").component;
    const { unmount } = render(<OrdersRoute />);
    expect(screen.getByText(/Current branch/).textContent).toContain(
      "Reconnecting",
    );
    expect(
      screen.getByRole("button", { name: "Open profile" }).textContent,
    ).toBe("W");
    fireEvent.click(screen.getByRole("button", { name: "Select list order" }));
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/orders/$orderId",
      params: { orderId: "o-list" },
    });
    unmount();

    const MenuRoute = routeByPath("/menu").component;
    render(<MenuRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Menu back" }));
    fireEvent.click(screen.getByRole("button", { name: "Place menu order" }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/orders/$orderId",
      params: { orderId: "o-placed" },
      replace: true,
    });
  });

  it("covers detail, add-items and profile routes including logout finally", async () => {
    const Detail = routeByPath("/orders/$orderId").component;
    const { unmount } = render(<Detail />);
    expect(screen.getByText("Detail order-42")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Detail back" }));
    fireEvent.click(screen.getByRole("button", { name: "Detail add items" }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/orders" });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/orders/$orderId/add",
      params: { orderId: "order-42" },
    });
    unmount();

    const Add = routeByPath("/orders/$orderId/add").component;
    render(<Add />);
    expect(screen.getByText("Menu order-42")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Menu back" }));
    fireEvent.click(screen.getByRole("button", { name: "Place menu order" }));
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/orders/$orderId",
      params: { orderId: "order-42" },
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/orders/$orderId",
      params: { orderId: "o-placed" },
      replace: true,
    });

    document.body.innerHTML = "";
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
    const Profile = routeByPath("/profile").component;
    render(<Profile />);
    fireEvent.click(screen.getByRole("button", { name: "Profile back" }));
    fireEvent.click(screen.getByRole("button", { name: "Profile logout" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" });
    expect(reload).toHaveBeenCalled();
  });
});
