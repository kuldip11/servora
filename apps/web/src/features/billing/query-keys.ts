import { branchQueryContextKey } from "@/shared/lib/query-context";

export const billingKeys = {
  all: ["billing"] as const,
  orders: () =>
    [...billingKeys.all, ...branchQueryContextKey(), "order"] as const,
  order: (orderId: string) => [...billingKeys.orders(), orderId] as const,
};
