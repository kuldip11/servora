import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { orderKeys } from "@/features/orders/query-keys";

export const useDashboardRealtimeSync = () => {
  const queryClient = useQueryClient();
  useRealtimeEvent("order.created", () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  });
  useRealtimeEvent("order.updated", () => {
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  });
};
