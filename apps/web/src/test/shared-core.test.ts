import { act } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AxiosError } from "axios";

import { useAuthStore } from "@/store/auth";
import { queryClient } from "@/shared/lib/query-client";
import { bootstrapAuthSession } from "@/shared/auth/bootstrap";
import { authService } from "@/features/auth/services/auth.service";

vi.mock("@/features/auth/services/auth.service", () => ({
  authService: { refresh: vi.fn() },
}));

const user = {
  id: "u1",
  email: "u@example.com",
  name: "Test User",
  tenantId: "tenant-1",
  branchId: "branch-1",
} as any;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useAuthStore.getState().logout();
});

describe("core web coverage", () => {
  it("covers auth store lifecycle and persistence", () => {
    useAuthStore.setState({ accessToken: "persisted" });

    act(() =>
      useAuthStore.getState().setAuth({
        user,
        accessToken: "access-1",
        membershipId: "membership-1",
        memberships: [{ id: "membership-1" }] as any,
      }),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().franchiseId).toBe("tenant-1");
    expect(useAuthStore.getState().branchId).toBe("branch-1");

    act(() =>
      useAuthStore.getState().setContext({
        membershipId: "membership-2",
        franchiseId: "tenant-2",
        branchId: "branch-2",
        memberships: [{ id: "membership-2" }] as any,
      }),
    );
    expect(useAuthStore.getState().membershipId).toBe("membership-2");
    expect(useAuthStore.getState().franchiseId).toBe("tenant-2");

    act(() => useAuthStore.getState().setAccessToken("access-2"));
    act(() => useAuthStore.getState().setBranchId(null));
    expect(useAuthStore.getState().branchId).toBeNull();

    act(() => useAuthStore.getState().logout());
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("covers bootstrap auth with successful cookie refresh and failed refresh", async () => {
    vi.mocked(authService.refresh).mockResolvedValueOnce({
      user,
      accessToken: "access-bootstrap",
    } as any);
    await bootstrapAuthSession();
    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    vi.mocked(authService.refresh).mockRejectedValueOnce(new Error("expired"));
    await bootstrapAuthSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("covers query retry policy branches", () => {
    const retry = queryClient.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    const axiosError = (status: number) =>
      new AxiosError("request failed", undefined, undefined, undefined, {
        status,
        statusText: "",
        headers: {},
        config: {} as any,
        data: null,
      });
    expect(retry(0, axiosError(401))).toBe(false);
    expect(retry(0, axiosError(403))).toBe(false);
    expect(retry(0, axiosError(404))).toBe(false);
    expect(retry(0, axiosError(500))).toBe(true);
    expect(retry(1, axiosError(500))).toBe(true);
    expect(retry(2, axiosError(500))).toBe(false);
    expect(retry(0, new Error("network"))).toBe(true);
  });
});
