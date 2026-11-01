import { useQuery } from "@tanstack/react-query";
import { getKitchenQueryScope } from "@/shared/lib/query-scope";
import {
  kitchenStationsQuery,
  kitchenTicketsQuery,
} from "@/features/kitchen/query/kitchen.queries";

export const useKitchenTickets = (stationId?: string) => {
  return useQuery(kitchenTicketsQuery(getKitchenQueryScope(), stationId));
};

export const useKitchenStations = () => {
  return useQuery(kitchenStationsQuery(getKitchenQueryScope()));
};
