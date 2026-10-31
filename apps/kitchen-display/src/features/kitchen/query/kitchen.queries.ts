import {
  fetchKitchenStations,
  fetchKitchenTickets,
} from "@/features/kitchen/api/tickets";
import { TICKETS_POLL_INTERVAL_MS } from "@/features/kitchen/constants";
import type { KitchenQueryScope } from "@/shared/lib/query-scope";
import { kitchenKeys } from "./kitchen.keys";

export const kitchenTicketsQuery = (
  scope: KitchenQueryScope,
  stationId?: string,
) => ({
  queryKey: kitchenKeys.ticketList(scope, stationId),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    fetchKitchenTickets(stationId, signal),
  refetchInterval: TICKETS_POLL_INTERVAL_MS,
});

export const kitchenStationsQuery = (scope: KitchenQueryScope) => ({
  queryKey: kitchenKeys.stations(scope),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    fetchKitchenStations(signal),
});
