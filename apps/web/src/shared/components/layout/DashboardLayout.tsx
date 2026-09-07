import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Table2,
  Package,
  Users,
  Receipt,
  Settings,
  ShieldCheck,
  ChefHat,
  Bell,
  Building2,
  Menu as MenuIcon,
  Sparkles,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/shared/utils";
import { Dialog, SkipLink } from "@pos/ui";
import { BranchSwitcher } from "./BranchSwitcher";
import { TenantSwitcher } from "./TenantSwitcher";
import { usePermissions } from "@/shared/auth/permissions";
import { RealtimeNotifications } from "./RealtimeNotifications";
import { UserMenu } from "./UserMenu";
import { GlobalCommandPalette } from "@/features/global-command/components/GlobalCommandPalette";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "analytics:read",
  },
  {
    to: "/menu-engineering",
    label: "Menu Engineering",
    icon: Sparkles,
    permission: "analytics:read",
  },
  {
    to: "/orders",
    label: "Orders",
    icon: ShoppingBag,
    permission: "orders:read",
  },
  {
    to: "/menu",
    label: "Menu",
    icon: UtensilsCrossed,
    permission: "menu:read",
  },
  {
    to: "/availability",
    label: "Availability",
    icon: Bell,
    permission: "menu:read",
  },
  {
    to: "/tables",
    label: "Tables",
    icon: Table2,
    permission: "tables:read",
    hideWhenTablesDisabled: true,
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: Package,
    permission: "inventory:read",
  },
  { to: "/staff", label: "Staff", icon: Users, permission: "staff:read" },
  {
    to: "/billing",
    label: "Billing",
    icon: Receipt,
    permission: "billing:read",
  },
  {
    to: "/business",
    label: "Business",
    icon: Building2,
    permission: "branch:read",
  },
  {
    to: "/audit",
    label: "Audit Log",
    icon: ShieldCheck,
    permission: "audit:read",
  },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const DashboardLayout = () => {
  const { user, branchId, memberships, membershipId } = useAuthStore();
  const { has } = usePermissions();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const previousPathname = useRef(pathname);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      document.getElementById("main-content")?.focus();
      previousPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  function closeMobileNavigation() {
    setMobileNavOpen(false);
    requestAnimationFrame(() => mobileNavTriggerRef.current?.focus());
  }

  const activeMembership = memberships.find(
    (membership) => membership.membershipId === membershipId,
  );
  const currentBranch =
    branchId && branchId !== "all"
      ? activeMembership?.branches.find((branch) => branch.id === branchId)
      : undefined;
  const tablesHidden =
    branchId !== "all" && currentBranch ? !currentBranch.tablesEnabled : false;

  return (
    <div className="flex h-screen min-w-0 bg-background overflow-hidden">
      <SkipLink />
      <RealtimeNotifications />

      {}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-surface border-r border-divider flex-col shadow-sm">
        {}
        <div className="px-6 py-5 border-b border-divider">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat
                aria-hidden="true"
                className="w-5 h-5 text-primary-foreground"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">POS System</p>
              <p className="text-xs text-text-secondary truncate max-w-[120px]">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
        </div>

        {}
        <nav
          aria-label="Main"
          className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        >
          {navItems
            .filter((item) => !item.permission || has(item.permission))
            .filter((item) => !item.hideWhenTablesDisabled || !tablesHidden)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                    "[&.active]:bg-primary-surface [&.active]:text-primary",
                  )}
                  activeProps={{ className: "active" }}
                >
                  <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {}
        <div className="p-3 border-t border-divider">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md mb-1">
            <div className="w-8 h-8 bg-primary-surface rounded-full flex items-center justify-center">
              <span
                aria-hidden="true"
                className="text-xs font-semibold text-primary"
              >
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {user?.roles[0]?.name ?? "Staff"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {mobileNavOpen && (
        <Dialog
          open
          onClose={closeMobileNavigation}
          title="Navigation"
          size="sm"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navItems
              .filter((item) => !item.permission || has(item.permission))
              .filter((item) => !item.hideWhenTablesDisabled || !tablesHidden)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileNavigation}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
                      "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
                      "[&.active]:bg-primary-surface [&.active]:text-primary",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    )}
                    activeProps={{ className: "active" }}
                  >
                    <Icon aria-hidden="true" className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </Dialog>
      )}

      {}
      <div className="flex-1 flex flex-col overflow-hidden">
        {}
        <header className="h-20 bg-surface border-b border-divider flex items-center justify-between gap-4 px-3 md:px-6 flex-shrink-0 min-w-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              ref={mobileNavTriggerRef}
              className="md:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MenuIcon aria-hidden="true" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <TenantSwitcher />
              <BranchSwitcher />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              aria-label="Open command and search"
              aria-haspopup="dialog"
              aria-expanded={commandOpen}
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden rounded border border-border bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-disabled lg:inline">
                Ctrl/⌘ K
              </kbd>
            </button>
            <button
              type="button"
              aria-label="Open command and search"
              aria-haspopup="dialog"
              aria-expanded={commandOpen}
              onClick={() => setCommandOpen(true)}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              <Search aria-hidden="true" className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              <Bell aria-hidden="true" className="w-5 h-5" />
            </button>
            <UserMenu />
          </div>
        </header>

        {}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto outline-none"
        >
          <Outlet />
        </main>
      </div>
      <GlobalCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </div>
  );
};
