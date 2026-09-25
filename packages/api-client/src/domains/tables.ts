import { voidDomainRequest } from "./shared";
import type { TableStatus } from "@pos/types";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export interface RestaurantTableDto {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
  section: string | null;
  status: TableStatus;
  isActive: boolean;
  publicQrToken: string;
  branch?: { id: string; name: string };
}

export interface TakeawayQrDto {
  branchId: string;
  branchName: string;
  enabled: boolean;
  token: string;
}

export interface TableInput {
  name: string;
  capacity?: number;
  section?: string;
  branchId?: string;
}

export const createTablesApi = (client: DomainHttpClient) => {
  return {
    list(signal?: AbortSignal): Promise<RestaurantTableDto[]> {
      return getDomainData<RestaurantTableDto[]>(
        client,
        "/tables",
        signal ? { signal } : undefined,
      );
    },
    create(input: TableInput): Promise<RestaurantTableDto> {
      return postDomainData<RestaurantTableDto>(client, "/tables", input);
    },
    update(
      id: string,
      input: Omit<TableInput, "branchId">,
    ): Promise<RestaurantTableDto> {
      return patchDomainData<RestaurantTableDto>(
        client,
        `/tables/${id}`,
        input,
      );
    },
    updateStatus(id: string, status: string): Promise<RestaurantTableDto> {
      return patchDomainData<RestaurantTableDto>(
        client,
        `/tables/${id}/status`,
        { status },
      );
    },
    remove(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/tables/${id}`));
    },
    regenerateQr(id: string): Promise<RestaurantTableDto> {
      return postDomainData<RestaurantTableDto>(
        client,
        `/tables/${id}/qr/regenerate`,
      );
    },
    getTakeawayQr(
      branchId: string,
      signal?: AbortSignal,
    ): Promise<TakeawayQrDto> {
      return getDomainData<TakeawayQrDto>(
        client,
        `/branches/${branchId}/takeaway-qr`,
        signal ? { signal } : undefined,
      );
    },
    regenerateTakeawayQr(branchId: string): Promise<TakeawayQrDto> {
      return postDomainData<TakeawayQrDto>(
        client,
        `/branches/${branchId}/takeaway-qr/regenerate`,
      );
    },
  };
};
