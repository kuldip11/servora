import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "@/features/inventory/services/inventory.service";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const useInventoryTransactions = () => {
  return useQuery({
    queryKey: inventoryKeys.transactions(),
    queryFn: ({ signal }) => inventoryService.transactions(signal),
  });
};
