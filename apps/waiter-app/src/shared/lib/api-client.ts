import { createApiClient, type TokenStorageAdapter } from "@pos/api-client";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { clearTokens, getToken, saveTokens } from "@/features/auth/storage";
import { queryClient } from "@/shared/lib/query-client";
import { clearWaiterQueries } from "@/shared/lib/query-lifecycle";

const waiterStorageAdapter: TokenStorageAdapter = {
  getAccessToken: getToken,
  getTenantId: () => localStorage.getItem(STORAGE_KEYS.tenant),
  getBranchId: () => localStorage.getItem(STORAGE_KEYS.branch),
  setAccessToken: saveTokens,
  clear: clearTokens,
};

export const apiClient = createApiClient({
  app: "waiter",
  baseURL: import.meta.env["VITE_API_URL"] ?? "/api",
  timeout: 15_000,
  storage: waiterStorageAdapter,
  onRefreshFailure: () => {
    void clearWaiterQueries(queryClient).finally(() => {
      waiterStorageAdapter.clear();
      window.location.reload();
    });
  },
});
