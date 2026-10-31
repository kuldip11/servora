import { useQuery } from "@tanstack/react-query";
import {
  inventoryItemsQuery,
  lowStockItemsQuery,
} from "@/features/inventory/query-options";
import type { InventoryListFilters } from "@pos/api-client";

export const useInventoryItems = (filters: InventoryListFilters = {}) => {
  return useQuery(inventoryItemsQuery(filters));
};

export const useLowStockItems = () => useQuery(lowStockItemsQuery());
