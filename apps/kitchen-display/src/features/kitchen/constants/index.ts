import type { KitchenTicketStatus } from "@pos/types";
import type { StatusTone } from "@pos/ui";

export const STATUS_CONFIG = {
  PENDING_PAYMENT: {
    label: "Awaiting Payment",
    next: null,
    nextLabel: null,
    border: "border-warning/40",
    badgeTone: "warning" as StatusTone,
    badgeTextClass: "text-amber-400",
    btn: "",
  },
  HELD: {
    label: "Held",
    next: "FIRED",
    nextLabel: "Fire Course",
    border: "border-text-disabled/40",
    badgeTone: "neutral" as StatusTone,
    badgeTextClass: "text-text-secondary",
    btn: "bg-primary hover:opacity-90 text-primary-foreground",
  },
  FIRED: {
    label: "Waiting",
    next: "PREPARING",
    nextLabel: "Start Cooking",
    border: "border-info/40",
    badgeTone: "info" as StatusTone,
    badgeTextClass: "text-blue-400",
    btn: "bg-info hover:opacity-90 text-info-foreground",
  },
  PREPARING: {
    label: "Cooking",
    next: "READY",
    nextLabel: "Mark Ready",
    border: "border-warning/40",
    badgeTone: "warning" as StatusTone,
    badgeTextClass: "text-amber-400",
    btn: "bg-warning hover:opacity-90 text-warning-foreground",
  },
  READY: {
    label: "Ready",
    next: null,
    nextLabel: null,
    border: "border-success/40",
    badgeTone: "success" as StatusTone,
    badgeTextClass: "text-emerald-400",
    btn: "",
  },
} as const satisfies Partial<Record<KitchenTicketStatus, unknown>>;

export const URGENT_THRESHOLD_MS = 15 * 60 * 1000;
export const TICKETS_POLL_INTERVAL_MS = 20_000;

export const BOARD_COLUMNS: Array<{
  title: string;
  status: KitchenTicketStatus;
  color: string;
}> = [
  { title: "Held", status: "HELD", color: "text-text-secondary" },
  { title: "New", status: "FIRED", color: "text-blue-400" },
  { title: "In Prep", status: "PREPARING", color: "text-amber-400" },
  { title: "Ready", status: "READY", color: "text-emerald-400" },
];

export const KDS_STATION_STORAGE_KEY = "servora.kds.station-id";
export const KDS_VOID_ALERT_STORAGE_KEY = "servora.kds.void-alerts";
