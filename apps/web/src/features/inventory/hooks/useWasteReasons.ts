import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "@/features/inventory/services/inventory.service";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const useWasteReasons = () => {
  return useQuery({
    queryKey: inventoryKeys.wasteReasons(),
    queryFn: ({ signal }) => inventoryService.wasteReasons(signal),
  });
};
