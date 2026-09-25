import type { QueryClient } from "@tanstack/react-query";
import { saveContext } from "@/features/auth/storage";

export const clearWaiterQueries = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries();
  queryClient.clear();
};

export const replaceWaiterContext = async (
  queryClient: QueryClient,
  tenantId: string,
  branchId: string | null,
) => {
  await clearWaiterQueries(queryClient);
  saveContext(tenantId, branchId);
};
