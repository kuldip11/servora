import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Order } from "@pos/types";
import type { OrdersListFilters } from "@pos/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";
import { fetchOrders } from "@/features/orders/api/orders";
import {
  orderKeys,
  ORDERS_POLL_INTERVAL_MS,
} from "@/features/orders/constants";
import {
  mergeRealtimeTicket,
  shouldApplyRealtime,
} from "@/features/orders/utils/realtime";

export const useOrders = (filters: OrdersListFilters) => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();
  const query = useQuery({
    queryKey: orderKeys.list(scope, filters),
    queryFn: (context) =>
      context?.signal
        ? fetchOrders(filters, context.signal)
        : fetchOrders(filters),
    refetchInterval: ORDERS_POLL_INTERVAL_MS,
  });

  const upsert = (order: Order) => {
    void qc.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    qc.setQueryData<Order>(orderKeys.detail(scope, order.id), (current) =>
      shouldApplyRealtime(current, order) ? order : current,
    );
  };

  useRealtimeEvent("order.created", (event) => upsert(event.payload));
  useRealtimeEvent("order.updated", (event) => upsert(event.payload));
  useRealtimeEvent("kitchen.ticket.updated", (event) => {
    void qc.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    qc.setQueryData<Order>(
      orderKeys.detail(scope, event.payload.orderId),
      (current) =>
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

  return { ...query, data: query.data?.items };
};

export const useOrdersPage = (filters: OrdersListFilters) => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();
  const query = useQuery({
    queryKey: orderKeys.list(scope, filters),
    queryFn: (context) =>
      context?.signal
        ? fetchOrders(filters, context.signal)
        : fetchOrders(filters),
    refetchInterval: ORDERS_POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });

  const sync = (order: Order) => {
    void qc.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    qc.setQueryData<Order>(orderKeys.detail(scope, order.id), (current) =>
      shouldApplyRealtime(current, order) ? order : current,
    );
  };
  useRealtimeEvent("order.created", (event) => sync(event.payload));
  useRealtimeEvent("order.updated", (event) => sync(event.payload));
  useRealtimeEvent("kitchen.ticket.updated", (event) => {
    void qc.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    qc.setQueryData<Order>(
      orderKeys.detail(scope, event.payload.orderId),
      (current) =>
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
  return query;
};

export const useInfiniteOrders = (filters: Omit<OrdersListFilters, "page">) => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();
  const query = useInfiniteQuery({
    queryKey: orderKeys.list(scope, { ...filters, mode: "infinite" }),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const pageFilters = {
        ...filters,
        page: pageParam,
        limit: filters.limit ?? 20,
      };
      return signal
        ? fetchOrders(pageFilters, signal)
        : fetchOrders(pageFilters);
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    refetchInterval: ORDERS_POLL_INTERVAL_MS,
  });

  const sync = (order: Order) => {
    void qc.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    qc.setQueryData<Order>(orderKeys.detail(scope, order.id), (current) =>
      shouldApplyRealtime(current, order) ? order : current,
    );
  };
  useRealtimeEvent("order.created", (event) => sync(event.payload));
  useRealtimeEvent("order.updated", (event) => sync(event.payload));
  useRealtimeEvent("kitchen.ticket.updated", (event) => {
    void qc.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    qc.setQueryData<Order>(
      orderKeys.detail(scope, event.payload.orderId),
      (current) =>
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
  return query;
};
