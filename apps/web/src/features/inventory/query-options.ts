import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { inventoryService } from "./services/inventory.service";
import { inventoryKeys } from "./query-keys";
import type { InventoryListFilters } from "@pos/api-client";
import { queryFreshness } from "@/shared/lib/query-policy";

export const inventoryItemsQuery = (filters: InventoryListFilters = {}) => {
  const hasFilters = Object.keys(filters).length > 0;
  return queryOptions({
    queryKey: hasFilters
      ? [...inventoryKeys.items(), filters]
      : inventoryKeys.items(),
    queryFn: ({ signal }) => inventoryService.list(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: queryFreshness.operational,
  });
};

export const lowStockItemsQuery = () =>
  queryOptions({
    queryKey: inventoryKeys.lowStock(),
    queryFn: ({ signal }) => inventoryService.lowStock(signal),
    staleTime: queryFreshness.operational,
  });
