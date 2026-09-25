import type { TransportInput } from "../types";
import { voidDomainRequest } from "./shared";
import type {
  InventoryItem,
  InventoryRecipeImpact,
  InventoryTransaction,
  WasteReason,
} from "@pos/types";
import type {
  CreateInventoryItemRequest,
  UpdateStockRequest,
} from "@pos/contracts";
import {
  getDomainData,
  getPaginatedDomainData,
  postDomainData,
  type DomainHttpClient,
  type PaginatedResult,
} from "./shared";

export interface LogWasteInput {
  quantity: number;
  wasteReasonId: string;
  notes?: string;
}

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
    ): Promise<PaginatedResult<InventoryItem>> {
      const params: Record<string, string> = {
        page: String(filters.page ?? 1),
        limit: String(filters.limit ?? 25),
      };
      if (filters.search) params["search"] = filters.search;
      if (filters.lowStockOnly) params["lowStockOnly"] = "true";
      return getPaginatedDomainData<InventoryItem>(client, "/inventory/items", {
        params,
        ...(signal ? { signal } : {}),
      });
    },
    lowStock(signal?: AbortSignal): Promise<InventoryItem[]> {
      return getDomainData<InventoryItem[]>(
        client,
        "/inventory/alerts/low-stock",
        signal ? { signal } : undefined,
      );
    },
    create(
      input: TransportInput<CreateInventoryItemRequest>,
    ): Promise<InventoryItem> {
      return postDomainData<InventoryItem>(client, "/inventory/items", input);
    },
    recipeImpact(
      itemId: string,
      signal?: AbortSignal,
    ): Promise<InventoryRecipeImpact> {
      return getDomainData<InventoryRecipeImpact>(
        client,
        `/inventory/items/${itemId}/recipe-impact`,
        signal ? { signal } : undefined,
      );
    },
    transactions(signal?: AbortSignal): Promise<InventoryTransaction[]> {
      return getDomainData<InventoryTransaction[]>(
        client,
        "/inventory/transactions",
        signal ? { signal } : undefined,
      );
    },
    updateStock(
      itemId: string,
      input: TransportInput<UpdateStockRequest>,
    ): Promise<void> {
      return voidDomainRequest(
        client.patch(`/inventory/items/${itemId}/stock`, input),
      );
    },
    wasteReasons(signal?: AbortSignal): Promise<WasteReason[]> {
      return getDomainData<WasteReason[]>(
        client,
        "/inventory/waste-reasons",
        signal ? { signal } : undefined,
      );
    },
    createWasteReason(label: string): Promise<WasteReason> {
      return postDomainData<WasteReason>(client, "/inventory/waste-reasons", {
        label,
      });
    },
    logWaste(itemId: string, input: LogWasteInput): Promise<void> {
      return voidDomainRequest(
        client.post(`/inventory/items/${itemId}/waste`, input),
      );
    },
  };
};
