import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClientConfig } from "@pos/api-client";

const mocks = vi.hoisted(() => ({
  createApiClient: vi.fn((_config: ApiClientConfig) => ({})),
}));

vi.mock("@pos/api-client", () => ({
  createApiClient: mocks.createApiClient,
}));

import { apiClient } from "@/shared/lib/api-client";
import { getToken, saveTokens } from "@/features/auth/storage";

describe("api client", () => {
  beforeEach(() => sessionStorage.clear());

  it("creates client with a complete storage adapter", () => {
    expect(apiClient).toBeTruthy();
    const config = mocks.createApiClient.mock.calls[0]![0];
    expect(config.timeout).toBe(15000);

    sessionStorage.setItem("kds_tenant", "tenant-1");
    sessionStorage.setItem("kds_branch", "branch-1");
    saveTokens("old");
    expect(config.storage.getAccessToken()).toBe("old");
    expect(config.storage.getTenantId?.()).toBe("tenant-1");
    expect(config.storage.getBranchId?.()).toBe("branch-1");
    config.storage.setAccessToken("new");
    expect(getToken()).toBe("new");
    config.storage.clear();
    expect(getToken()).toBeNull();
    expect(config.storage.getTenantId?.()).toBeNull();
    expect(config.storage.getBranchId?.()).toBeNull();
  });

  it("clears auth context on refresh failure", () => {
    const config = mocks.createApiClient.mock.calls[0]![0];
    saveTokens("token");
    sessionStorage.setItem("kds_tenant", "tenant-1");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    config.onRefreshFailure?.();
    expect(getToken()).toBeNull();
    expect(sessionStorage.getItem("kds_tenant")).toBeNull();
    consoleError.mockRestore();
  });
});
