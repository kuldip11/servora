import type { QueryClient } from "@tanstack/react-query";
import { saveContext } from "@/features/auth/storage";

export const clearKitchenQueries = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries();
  queryClient.clear();
};

export const replaceKitchenContext = async (
  queryClient: QueryClient,
  tenantId: string,
  branchId: string | null,
) => {
  await clearKitchenQueries(queryClient);
  saveContext(tenantId, branchId);
};
