import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  customerBootstrapQuery,
  type CustomerBootstrapData,
  type CustomerSessionState,
} from "@/features/session/query/customer.queries";

export type { CustomerBootstrapData, CustomerSessionState };

export const useCustomerBootstrap = (
  qrToken: string | null,
  storageScope: string | null,
) => {
  const queryClient = useQueryClient();
  return useQuery(customerBootstrapQuery(queryClient, qrToken, storageScope));
};
