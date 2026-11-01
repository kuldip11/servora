import { formatDistanceToNow } from "date-fns";
import type { KitchenTicketDto as KitchenTicket } from "@pos/api-client";
import { URGENT_THRESHOLD_MS } from "@/features/kitchen/constants";

export const calculateElapsedMs = (firedAt: string | null): number => {
  return firedAt ? Date.now() - new Date(firedAt).getTime() : 0;
};

export const isUrgent = (firedAt: string | null): boolean => {
  return firedAt !== null && calculateElapsedMs(firedAt) > URGENT_THRESHOLD_MS;
};

export const formatTicketAge = (firedAt: string | null): string => {
  return firedAt
    ? formatDistanceToNow(new Date(firedAt), { addSuffix: false })
    : "Held";
};

export const groupTicketsByStatus = (
  tickets: KitchenTicket[] | undefined,
  status: KitchenTicket["status"],
): KitchenTicket[] => {
  return tickets?.filter((ticket) => ticket.status === status) ?? [];
};

export const filterTicketForStation = (
  ticket: KitchenTicket,
  stationId?: string,
): KitchenTicket | null => {
  if (!stationId) return ticket;
  const items = ticket.items.filter(
    (item) =>
      item.menuItemId === null ||
      item.stationId === null ||
      item.stationId === stationId,
  );
  if (!items.some((item) => item.menuItemId !== null)) return null;
  return { ...ticket, items };
};

export const voidUrgency = (
  ticket: KitchenTicket,
): "none" | "warning" | "danger" => {
  if (!ticket.items.some((item) => item.itemStatus === "VOIDED")) return "none";
  return ticket.status === "PREPARING" || ticket.status === "READY"
    ? "danger"
    : "warning";
};
