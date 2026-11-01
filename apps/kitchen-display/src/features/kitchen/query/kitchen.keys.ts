import type { KitchenQueryScope } from "@/shared/lib/query-scope";

export const kitchenKeys = {
  all: (scope: KitchenQueryScope) => ["kitchen", ...scope] as const,
  tickets: (scope: KitchenQueryScope) =>
    [...kitchenKeys.all(scope), "tickets"] as const,
  ticketList: (scope: KitchenQueryScope, stationId?: string) =>
    [...kitchenKeys.tickets(scope), stationId ?? "all"] as const,
  stations: (scope: KitchenQueryScope) =>
    [...kitchenKeys.all(scope), "stations"] as const,
};
