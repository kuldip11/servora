import {
  createApiClient,
  extractApiError,
  toApiClientError,
  type TokenStorageAdapter,
} from "@pos/api-client";
import { useAuthStore } from "@/store/auth";
import { queryClient } from "./query-client";

const webStorageAdapter: TokenStorageAdapter = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (accessToken) =>
    useAuthStore.getState().setAccessToken(accessToken),
  clear: () => {
    useAuthStore.getState().logout();
    queryClient.clear();
  },
  getTenantId: () => useAuthStore.getState().franchiseId,
  getBranchId: () => useAuthStore.getState().branchId,
};

export const apiClient = createApiClient({
  app: "web",
  baseURL: import.meta.env["VITE_API_URL"] ?? "/api",
  timeout: 30_000,
  storage: webStorageAdapter,
  onRefreshFailure: () => webStorageAdapter.clear(),
});

export { extractApiError, toApiClientError };
