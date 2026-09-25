import type { QueryClient } from "@tanstack/react-query";
import {
  clearPersistedOrderId,
  clearPersistedSession,
} from "@/features/cart/persistence";
import { customerKeys } from "./customer.keys";

export const clearCustomerSessionQueries = async (
  queryClient: QueryClient,
  storageScope: string | null,
  sessionToken?: string,
) => {
  const queryKey = customerKeys.session(storageScope, sessionToken);
  await queryClient.cancelQueries({ queryKey });
  queryClient.removeQueries({ queryKey });
};

export const expireCustomerSession = async (
  queryClient: QueryClient,
  storageScope: string,
  sessionToken?: string,
) => {
  await clearCustomerSessionQueries(queryClient, storageScope, sessionToken);
  clearPersistedSession(storageScope);
  clearPersistedOrderId(storageScope);
};
