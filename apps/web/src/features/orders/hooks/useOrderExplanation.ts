import { useQuery } from "@tanstack/react-query";
import { orderExplanationQuery } from "@/features/orders/query-options";

export const useOrderExplanation = (
  orderId: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    ...orderExplanationQuery(orderId),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
};
