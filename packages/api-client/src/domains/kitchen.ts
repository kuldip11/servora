import { voidDomainRequest } from "./shared";
import type {
  KitchenStation,
  KitchenTicket,
  KitchenTicketStatus,
} from "@pos/types";
import { getDomainData, type DomainHttpClient } from "./shared";

export const createKitchenApi = (client: DomainHttpClient) => {
  return {
    tickets(
      stationId?: string,
      signal?: AbortSignal,
    ): Promise<KitchenTicket[]> {
      return getDomainData<KitchenTicket[]>(
        client,
        "/kitchen-tickets",
        stationId || signal
          ? {
              ...(stationId ? { params: { stationId } } : {}),
              ...(signal ? { signal } : {}),
            }
          : undefined,
      );
    },
    stations(signal?: AbortSignal): Promise<KitchenStation[]> {
      return getDomainData<KitchenStation[]>(
        client,
        "/kitchen-tickets/stations",
        signal ? { signal } : undefined,
      );
    },
    updateTicketStatus(id: string, status: KitchenTicketStatus): Promise<void> {
      return voidDomainRequest(
        client.patch(`/kitchen-tickets/${id}/status`, { status }),
      );
    },
  };
};
