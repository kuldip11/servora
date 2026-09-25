import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  ordersService,
  type OrdersListFilters,
} from "./services/orders.service";
import { orderKeys } from "./query-keys";
import { queryFreshness } from "@/shared/lib/query-policy";

export const ordersListQuery = (filters: OrdersListFilters) => {
  return queryOptions({
    queryKey: orderKeys.list(filters),
    queryFn: ({ signal }) => ordersService.list(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: queryFreshness.operational,
  });
};

export const orderDetailQuery = (orderId: string) => {
  return queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => ordersService.detail(orderId, signal),
    enabled: Boolean(orderId),
    staleTime: queryFreshness.operational,
  });
};

export const orderExplanationQuery = (orderId: string) => {
  return queryOptions({
    queryKey: orderKeys.explanation(orderId),
    queryFn: ({ signal }) => ordersService.explain(orderId, signal),
    enabled: Boolean(orderId),
    staleTime: queryFreshness.normal,
  });
};
