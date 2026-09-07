import { ClipboardList, Home, Plus } from "lucide-react";
import { type ReactNode } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { getWaiterName } from "@/features/auth";
import { useMyBranch } from "@/features/menu/hooks/useMyBranch";
import { useWaiterAttention } from "@/features/orders/hooks/useWaiterAttention";
import { useConnectionStatus } from "@/shared/lib/realtime";

export interface AppLayoutProps {
  children?: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHome = pathname === "/";
  const isOrders = pathname === "/orders" || pathname.startsWith("/orders/");
  const isMenu = pathname === "/menu";
  const isConnected = useConnectionStatus();
  const { data: branch } = useMyBranch();
  const waiterName = getWaiterName();

  useWaiterAttention();

  const initials =
    waiterName
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "W";

  return (
    <div className="flex h-screen flex-col bg-background shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-divider bg-surface px-[18px] pb-3.5 pt-[18px] safe-area-top">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
            <span
              className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-warning"}`}
            />
            {branch?.name ?? "Current branch"} ·{" "}
            {isConnected ? "Live" : "Reconnecting"}
          </p>
          <p className="mt-0.5 truncate text-base font-medium text-text-primary">
            {waiterName}&apos;s service
          </p>
        </div>
        <button
          type="button"
          aria-label="Open profile"
          onClick={() => navigate({ to: "/profile" })}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary-surface text-sm font-medium text-primary"
        >
          {initials}
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {children ?? <Outlet />}
      </div>

      <nav
        aria-label="Primary"
        className="grid grid-cols-3 border-t border-border bg-surface safe-area-bottom"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          aria-current={isHome ? "page" : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isHome ? "text-primary" : "text-text-secondary"}`}
        >
          <Home className="h-5 w-5" />
          Home
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/orders" })}
          aria-current={isOrders ? "page" : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isOrders ? "text-primary" : "text-text-secondary"}`}
        >
          <ClipboardList className="h-5 w-5" />
          Orders
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/menu" })}
          aria-label="Create new order"
          aria-current={isMenu ? "page" : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isMenu ? "text-primary" : "text-text-secondary"}`}
        >
          <Plus className="h-5 w-5" />
          <span>New order</span>
        </button>
      </nav>
    </div>
  );
};
