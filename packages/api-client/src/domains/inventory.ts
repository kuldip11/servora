import type { TransportInput } from "../types";
import type {
  CreateWasteReasonRequest,
  CreateInventoryItemRequest,
  InventoryItemResponse,
  InventoryRecipeImpactResponse,
  InventoryStockUpdateResponse,
  InventoryTransactionResponse,
  LogWasteRequest,
  UpdateStockRequest,
  WasteReasonResponse,
} from "@pos/contracts";
import {
  getDomainData,
  getPaginatedDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
  type PaginatedResult,
} from "./shared";

export type InventoryItemDto = InventoryItemResponse;
export type InventoryRecipeImpactDto = InventoryRecipeImpactResponse;
export type InventoryTransactionDto = InventoryTransactionResponse;
export type InventoryStockUpdateDto = InventoryStockUpdateResponse;
export type WasteReasonDto = WasteReasonResponse;
export type LogWasteInput = LogWasteRequest;
export type InventoryUnitDto = CreateInventoryItemRequest["unit"];
export type InventoryTransactionTypeDto = UpdateStockRequest["transactionType"];

export interface InventoryListFilters {
  page?: number;
  limit?: number;
  search?: string;
  lowStockOnly?: boolean;
}

export const createInventoryApi = (client: DomainHttpClient) => {
  return {
    list(
      filters: InventoryListFilters = {},
      signal?: AbortSignal,
    ): Promise<PaginatedResult<InventoryItemDto>> {
      const params: Record<string, string> = {
        page: String(filters.page ?? 1),
        limit: String(filters.limit ?? 25),
      };
      if (filters.search) params["search"] = filters.search;
      if (filters.lowStockOnly) params["lowStockOnly"] = "true";
      return getPaginatedDomainData<InventoryItemDto>(
        client,
        "/inventory/items",
        {
          params,
          ...(signal ? { signal } : {}),
        },
      );
    },
    lowStock(signal?: AbortSignal): Promise<InventoryItemDto[]> {
      return getDomainData<InventoryItemDto[]>(
        client,
        "/inventory/alerts/low-stock",
        signal ? { signal } : undefined,
      );
    },
    create(
      input: TransportInput<CreateInventoryItemRequest>,
    ): Promise<InventoryItemDto> {
      return postDomainData<InventoryItemDto>(
        client,
        "/inventory/items",
        input,
      );
    },
    recipeImpact(
      itemId: string,
      signal?: AbortSignal,
    ): Promise<InventoryRecipeImpactDto> {
      return getDomainData<InventoryRecipeImpactDto>(
        client,
        `/inventory/items/${itemId}/recipe-impact`,
        signal ? { signal } : undefined,
      );
    },
    transactions(signal?: AbortSignal): Promise<InventoryTransactionDto[]> {
      return getDomainData<InventoryTransactionDto[]>(
        client,
        "/inventory/transactions",
        signal ? { signal } : undefined,
      );
    },
    updateStock(
      itemId: string,
      input: TransportInput<UpdateStockRequest>,
    ): Promise<InventoryStockUpdateDto> {
      return patchDomainData<InventoryStockUpdateDto>(
        client,
        `/inventory/items/${itemId}/stock`,
        input,
      );
    },
    wasteReasons(signal?: AbortSignal): Promise<WasteReasonDto[]> {
      return getDomainData<WasteReasonDto[]>(
        client,
        "/inventory/waste-reasons",
        signal ? { signal } : undefined,
      );
    },
    createWasteReason(label: string): Promise<WasteReasonDto> {
      const input: CreateWasteReasonRequest = { label };
      return postDomainData<WasteReasonDto>(
        client,
        "/inventory/waste-reasons",
        input,
      );
    },
    logWaste(
      itemId: string,
      input: LogWasteInput,
    ): Promise<InventoryStockUpdateDto> {
      return postDomainData<InventoryStockUpdateDto>(
        client,
        `/inventory/items/${itemId}/waste`,
        input,
      );
    },
  };
};
