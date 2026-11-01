import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const useInventoryRealtimeSync = () => {
  const queryClient = useQueryClient();
  useRealtimeEvent("inventory.low_stock", () => {
    // Stock changes can change filtered page membership, totals and alerts.
    void queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    void queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
  });
};
