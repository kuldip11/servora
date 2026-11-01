import { QueryClient } from "@tanstack/react-query";
import { isRetryableApiError } from "@pos/api-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error: unknown) =>
        isRetryableApiError(error) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});
