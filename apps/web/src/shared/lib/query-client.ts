import { QueryClient } from "@tanstack/react-query";
import { isRetryableApiError } from "@pos/api-client";
import { queryFreshness, queryGarbageCollection } from "./query-policy";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: queryFreshness.normal,
      gcTime: queryGarbageCollection.normal,
      retry: (failureCount, error: unknown) =>
        isRetryableApiError(error) && failureCount < 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
