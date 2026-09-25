import { useQuery } from "@tanstack/react-query";
import { orderBillsQuery } from "@/features/billing/query-options";

export const useOrderBills = (
  orderId: string | null | undefined,
  options?: { enabled?: boolean },
) => {
  const validOrderId = orderId ?? "";
  return useQuery({
    ...orderBillsQuery(validOrderId),
    enabled:
      Boolean(validOrderId) &&
      (options?.enabled === undefined ? true : options.enabled),
  });
};
