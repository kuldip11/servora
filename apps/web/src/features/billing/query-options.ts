import { queryOptions } from "@tanstack/react-query";
import { billingKeys } from "@/features/billing/query-keys";
import { billingService } from "@/features/billing/services/billing.service";

export const orderBillsQuery = (orderId: string) =>
  queryOptions({
    queryKey: billingKeys.order(orderId),
    queryFn: ({ signal }) => billingService.getOrderBills(orderId, signal),
    enabled: Boolean(orderId),
  });
