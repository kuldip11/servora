import { voidDomainRequest } from "./shared";
import type {
  KitchenQueueTicketResponse,
  KitchenStationResponse,
  UpdateKitchenTicketStatusRequest,
} from "@pos/contracts";
import { getDomainData, type DomainHttpClient } from "./shared";

export type KitchenTicketDto = KitchenQueueTicketResponse;
export type KitchenStationDto = KitchenStationResponse;
export type KitchenTicketStatus = KitchenQueueTicketResponse["status"];
export type KitchenTicketUpdateStatus =
  UpdateKitchenTicketStatusRequest["status"];

export const createKitchenApi = (client: DomainHttpClient) => {
  return {
    tickets(
      stationId?: string,
      signal?: AbortSignal,
    ): Promise<KitchenTicketDto[]> {
      return getDomainData<KitchenTicketDto[]>(
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
    stations(signal?: AbortSignal): Promise<KitchenStationDto[]> {
      return getDomainData<KitchenStationDto[]>(
        client,
        "/kitchen-tickets/stations",
        signal ? { signal } : undefined,
      );
    },
    updateTicketStatus(
      id: string,
      status: KitchenTicketUpdateStatus,
    ): Promise<void> {
      return voidDomainRequest(
        client.patch(`/kitchen-tickets/${id}/status`, { status }),
      );
    },
  };
};
