import { QueryClient } from "@tanstack/react-query";
import { isRetryableApiError } from "@pos/api-client";

export const customerQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) =>
        isRetryableApiError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: {
      retry: false,
    },
  },
});
