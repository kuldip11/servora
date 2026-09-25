import { createApiClient, type TokenStorageAdapter } from "@pos/api-client";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { clearTokens, getToken, saveTokens } from "@/features/auth/storage";
import { queryClient } from "@/shared/lib/query-client";
import { clearKitchenQueries } from "@/shared/lib/query-lifecycle";

const kdsStorageAdapter: TokenStorageAdapter = {
  getAccessToken: getToken,
  getTenantId: () => sessionStorage.getItem(STORAGE_KEYS.tenant),
  getBranchId: () => sessionStorage.getItem(STORAGE_KEYS.branch),
  setAccessToken: saveTokens,
  clear: clearTokens,
};

export const apiClient = createApiClient({
  app: "kitchen",
  baseURL: import.meta.env["VITE_API_URL"] ?? "/api",
  timeout: 15_000,
  storage: kdsStorageAdapter,
  onRefreshFailure: () => {
    void clearKitchenQueries(queryClient).finally(() => {
      kdsStorageAdapter.clear();
      window.location.reload();
    });
  },
});
