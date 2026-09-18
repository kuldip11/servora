import { QueryClient } from "@tanstack/react-query";
import { isRetryableApiError } from "@pos/api-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 15,
      retry: (failureCount, error: unknown) =>
        isRetryableApiError(error) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
