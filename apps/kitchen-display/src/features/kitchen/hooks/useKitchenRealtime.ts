import { useQueryClient } from "@tanstack/react-query";
import type { KitchenTicket } from "@pos/types";
import { useRealtimeEvent, useConnectionStatus } from "@/shared/lib/realtime";
import { filterTicketForStation } from "@/features/kitchen/utils/ticket";
import { kitchenKeys } from "@/features/kitchen/query/kitchen.keys";
import { getKitchenQueryScope } from "@/shared/lib/query-scope";

const isVisible = (ticket: KitchenTicket) => {
  return ["HELD", "FIRED", "PREPARING", "READY"].includes(ticket.status);
};

export const mergeKitchenTicketIntoQueue = (
  current: KitchenTicket[] | undefined,
  incoming: KitchenTicket,
  stationId?: string,
): KitchenTicket[] => {
  const existing = current?.find((item) => item.id === incoming.id);
  if (
    existing?.updatedAt &&
    incoming.updatedAt &&
    new Date(existing.updatedAt).getTime() >
      new Date(incoming.updatedAt).getTime()
  ) {
    return current ?? [];
  }
  const ticket = filterTicketForStation(incoming, stationId);
  const without = (current ?? []).filter((item) => item.id !== incoming.id);
  if (!ticket || !isVisible(ticket)) return without;
  return [...without, ticket].sort(
    (a, b) =>
      (a.firedAt ? new Date(a.firedAt).getTime() : 0) -
      (b.firedAt ? new Date(b.firedAt).getTime() : 0),
  );
};

export const useKitchenRealtime = (
  stationId?: string,
): { connected: boolean } => {
  const qc = useQueryClient();
  const connected = useConnectionStatus();
  const key = kitchenKeys.ticketList(getKitchenQueryScope(), stationId);
  const upsert = (incoming: KitchenTicket) => {
    qc.setQueryData<KitchenTicket[]>(key, (current) =>
      mergeKitchenTicketIntoQueue(current, incoming, stationId),
    );
  };
  useRealtimeEvent("kitchen.ticket.created", (event) => upsert(event.payload));
  useRealtimeEvent("kitchen.ticket.updated", (event) => upsert(event.payload));
  useRealtimeEvent("order.item.voided", (event) => upsert(event.payload));
  return { connected };
};
