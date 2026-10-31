import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { orderKeys } from "@/features/orders/public/query-keys";

export const useDashboardRealtimeSync = () => {
  const queryClient = useQueryClient();
  useRealtimeEvent("order.created", () => {
    void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  });
  useRealtimeEvent("order.updated", () => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  });
};
