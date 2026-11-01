import type { WaiterQueryScope } from "@/shared/lib/query-scope";

export const orderKeys = {
  root: ["waiter-orders"] as const,
  all: (scope: WaiterQueryScope) => ["waiter-orders", ...scope] as const,
  lists: (scope: WaiterQueryScope) =>
    [...orderKeys.all(scope), "list"] as const,
  list: (scope: WaiterQueryScope, filters: object) =>
    [...orderKeys.lists(scope), filters] as const,
  detail: (scope: WaiterQueryScope, id: string) =>
    [...orderKeys.all(scope), "detail", id] as const,
  cancellationReasons: (scope: WaiterQueryScope) =>
    [...orderKeys.all(scope), "cancellation-reasons", "active"] as const,
};

export const ORDERS_POLL_INTERVAL_MS = 15_000;
export const ORDER_DETAIL_POLL_INTERVAL_MS = 10_000;

export const STATUS_CONFIG = {
  OPEN: { label: "Open", color: "text-info", bg: "bg-info-surface" },
  BILL_REQUESTED: {
    label: "Bill Requested",
    color: "text-warning",
    bg: "bg-warning-surface",
  },
  PAID: { label: "Paid", color: "text-primary", bg: "bg-primary-surface" },
  CLOSED: {
    label: "Closed",
    color: "text-text-secondary",
    bg: "bg-surface-secondary",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-danger",
    bg: "bg-danger-surface",
  },
} satisfies Record<string, { label: string; color: string; bg: string }>;

export const TICKET_STATUS_LABEL: Record<string, string> = {
  HELD: "Held",
  FIRED: "Waiting",
  PREPARING: "Cooking",
  READY: "Ready",
  SERVED: "Served",
};
