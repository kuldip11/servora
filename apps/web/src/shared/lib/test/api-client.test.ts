import { beforeEach, describe, expect, it, vi } from "vitest";

const { createApiClient, extractApiError, capturedConfig } = vi.hoisted(() => {
  const capturedConfig: { current?: any } = {};
  return {
    capturedConfig,
    createApiClient: vi.fn((config: any) => {
      capturedConfig.current = config;
      return { get: vi.fn() };
    }),
    extractApiError: vi.fn((error: unknown) => error),
  };
});

vi.mock("@pos/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/api-client")>()),
  createApiClient,
  extractApiError,
}));

const authState = vi.hoisted(() => ({
  accessToken: "access-1" as string | null,
  franchiseId: "tenant-1" as string | null,
  branchId: "branch-1" as string | null,
  setAccessToken: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../../../store/auth", () => ({
  useAuthStore: Object.assign(
    vi.fn((selector: (state: typeof authState) => unknown) =>
      selector(authState),
    ),
    { getState: () => authState },
  ),
}));

vi.mock("../query-client", () => ({ queryClient: { clear: vi.fn() } }));

import { apiClient } from "@/shared/lib/api-client";
import { queryClient } from "@/shared/lib/query-client";

const config = () => capturedConfig.current as any;

describe("web api client adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.accessToken = "access-1";
    authState.franchiseId = "tenant-1";
    authState.branchId = "branch-1";
  });

  it("creates the client with web defaults and reads auth context", () => {
    expect(apiClient).toBeDefined();
    expect(config()).toEqual(
      expect.objectContaining({ baseURL: "/api", timeout: 30_000 }),
    );

    expect(config().storage.getAccessToken()).toBe("access-1");
    expect(config().storage.getTenantId()).toBe("tenant-1");
    expect(config().storage.getBranchId()).toBe("branch-1");
  });

  it("writes tokens and clears the web session on refresh failure", () => {
    config().storage.setAccessToken("next-access");
    expect(authState.setAccessToken).toHaveBeenCalledWith("next-access");

    config().storage.clear();
    expect(authState.logout).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it("re-exports extractApiError from the shared client package", async () => {
    const error = new Error("bad request");
    const { extractApiError: exported } = await import("../api-client");
    exported(error);
    expect(extractApiError).toHaveBeenCalledWith(error);
  });
});
