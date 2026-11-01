import type { OrdersListFilters } from "./services/orders.service";
import { branchQueryContextKey } from "@/shared/lib/query-context";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list", ...branchQueryContextKey()] as const,
  list: (filters: OrdersListFilters) =>
    [...orderKeys.lists(), filters] as const,
  details: () =>
    [...orderKeys.all, "detail", ...branchQueryContextKey()] as const,
  detail: (orderId: string) => [...orderKeys.details(), orderId] as const,
  explanation: (orderId: string) =>
    [...orderKeys.detail(orderId), "explanation"] as const,
};
