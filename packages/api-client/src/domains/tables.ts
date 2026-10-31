import { voidDomainRequest } from "./shared";
import type {
  BranchTakeawayQrResponse,
  CreateTableRequest,
  TableResponse,
  TableStatusContract,
  UpdateTableRequest,
} from "@pos/contracts";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export type RestaurantTableDto = TableResponse;
export type TakeawayQrDto = BranchTakeawayQrResponse;
export type TableInput = CreateTableRequest;

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
    update(id: string, input: UpdateTableRequest): Promise<RestaurantTableDto> {
      return patchDomainData<RestaurantTableDto>(
        client,
        `/tables/${id}`,
        input,
      );
    },
    updateStatus(
      id: string,
      status: TableStatusContract,
    ): Promise<RestaurantTableDto> {
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
