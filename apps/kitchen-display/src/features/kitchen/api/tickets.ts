import { createKitchenApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const kitchenApi = createKitchenApi(apiClient);
import type {
  KitchenStation,
  KitchenTicket,
  KitchenTicketStatus,
} from "@pos/types";

export const fetchKitchenTickets = async (
  stationId?: string,
  signal?: AbortSignal,
): Promise<KitchenTicket[]> => {
  return kitchenApi.tickets(stationId, signal);
};

export const fetchKitchenStations = async (
  signal?: AbortSignal,
): Promise<KitchenStation[]> => {
  return kitchenApi.stations(signal);
};

export const updateTicketStatus = async (
  id: string,
  status: KitchenTicketStatus,
): Promise<void> => {
  await kitchenApi.updateTicketStatus(id, status);
};
