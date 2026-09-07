import {
  AlertTriangle,
  ChefHat,
  Package,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export const ANALYTICS_STATUS_TONE: Partial<
  Record<string, "info" | "warning" | "neutral" | "danger">
> = {
  OPEN: "info",
  BILL_REQUESTED: "warning",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

type DashboardQuickAction = {
  label: string;
  icon: LucideIcon;
  to: "/orders" | "/inventory";
  search?: { view: "kitchen" } | { filter: "low" };
};

export const DASHBOARD_QUICK_ACTIONS: readonly DashboardQuickAction[] = [
  { label: "New Order", icon: ShoppingBag, to: "/orders" as const },
  {
    label: "Kitchen Queue",
    icon: ChefHat,
    to: "/orders" as const,
    search: { view: "kitchen" },
  },
  { label: "Inventory", icon: Package, to: "/inventory" as const },
  {
    label: "Low Stock",
    icon: AlertTriangle,
    to: "/inventory" as const,
    search: { filter: "low" },
  },
] as const;

export const ANALYTICS_SELECT_CLASS =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary";
