import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderDto as Order } from "@pos/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";
import { fetchOrder } from "@/features/orders/api/orders";
import {
  orderKeys,
  ORDER_DETAIL_POLL_INTERVAL_MS,
} from "@/features/orders/constants";
import { mergeRealtimeTicket } from "@/features/orders/utils/realtime";

export const useOrder = (orderId: string | null) => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();

  useRealtimeEvent("order.updated", (event) => {
    if (orderId && event.payload.id === orderId)
      void qc.invalidateQueries({ queryKey: orderKeys.detail(scope, orderId) });
  });
  useRealtimeEvent("order.created", (event) => {
    if (orderId && event.payload.id === orderId)
      void qc.invalidateQueries({ queryKey: orderKeys.detail(scope, orderId) });
  });
  useRealtimeEvent("kitchen.ticket.updated", (event) => {
    if (!orderId || event.payload.orderId !== orderId) return;
    qc.setQueryData<Order>(orderKeys.detail(scope, orderId), (current) =>
      current
        ? {
            ...current,
            kitchenTickets: mergeRealtimeTicket(
              current.kitchenTickets ?? [],
              event.payload,
            ),
          }
        : current,
    );
  });

  return useQuery({
    queryKey: orderKeys.detail(scope, orderId ?? ""),
    queryFn: (context) =>
      context?.signal
        ? fetchOrder(orderId!, context.signal)
        : fetchOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: ORDER_DETAIL_POLL_INTERVAL_MS,
  });
};
