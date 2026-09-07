import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { toast, mutate, api, storage, extractApiError, holder } = vi.hoisted(
  () => ({
    toast: vi.fn(),
    mutate: vi.fn(),
    api: { login: vi.fn(), fetchMemberships: vi.fn(), fetchMe: vi.fn() },
    storage: {
      saveTokens: vi.fn(),
      saveProfile: vi.fn(),
      saveContext: vi.fn(),
      clearTokens: vi.fn(),
    },
    extractApiError: vi.fn((e: any) => e?.message ?? "err"),
    holder: { mutationConfig: undefined as any },
  }),
);
vi.mock("@tanstack/react-query", () => ({
  useMutation: (c: any) => {
    holder.mutationConfig = c;
    return { mutate, isPending: false };
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@pos/api-client", () => ({ extractApiError }));
vi.mock("@/features/auth/api/login", () => api);
vi.mock("@/features/auth/storage", () => storage);
import { useLogin } from "../useLogin";
beforeEach(() => {
  vi.clearAllMocks();
  holder.mutationConfig = undefined;
});

describe("useLogin", () => {
  it("covers credential submission, no memberships and mutation error", async () => {
    const onLogin = vi.fn();
    const { result } = renderHook(() => useLogin(onLogin));
    act(() => result.current.submitCredentials({ email: "a", password: "b" }));
    expect(mutate).toHaveBeenCalled();
    api.login.mockResolvedValue({ accessToken: "t", user: { id: "u" } });
    api.fetchMemberships.mockResolvedValue([]);
    await act(async () => {
      await expect(
        holder.mutationConfig.mutationFn({ email: "a", password: "b" }),
      ).rejects.toThrow("No business membership");
    });
    holder.mutationConfig.onError(new Error("bad"));
    expect(storage.clearTokens).toHaveBeenCalled();
  });
  it("covers one membership with one branch", async () => {
    const onLogin = vi.fn();
    renderHook(() => useLogin(onLogin));
    api.login.mockResolvedValue({ accessToken: "t", user: {} });
    api.fetchMemberships.mockResolvedValue([
      {
        membershipId: "m",
        tenant: { id: "t1" },
        branches: [{ id: "b1", isActive: true }],
      },
    ]);
    api.fetchMe.mockResolvedValue({ id: "u" });
    await act(async () => {
      await holder.mutationConfig.mutationFn({ email: "a", password: "b" });
    });
    expect(storage.saveContext).toHaveBeenCalledWith("t1", "b1");
    expect(onLogin).toHaveBeenCalled();
  });
  it("covers inactive/no branch failure and multiple membership/branch selection", async () => {
    const onLogin = vi.fn();
    const { result } = renderHook(() => useLogin(onLogin));
    api.login.mockResolvedValue({ accessToken: "t", user: {} });
    api.fetchMemberships.mockResolvedValue([
      {
        membershipId: "m0",
        tenant: { id: "t0" },
        branches: [{ id: "x", isActive: false }],
      },
    ]);
    await act(async () => {
      await expect(
        holder.mutationConfig.mutationFn({ email: "a", password: "b" }),
      ).rejects.toThrow("No active branch");
    });

    const memberships = [
      {
        membershipId: "m1",
        tenant: { id: "t1" },
        branches: [{ id: "b1" }, { id: "b2", isActive: true }],
      },
      { membershipId: "m2", tenant: { id: "t2" }, branches: [{ id: "b3" }] },
    ];
    api.fetchMemberships.mockResolvedValue(memberships);
    await act(async () => {
      await holder.mutationConfig.mutationFn({ email: "a", password: "b" });
    });
    expect(result.current.step).toBe("membership");
    act(() => result.current.selectMembership("missing"));
    act(() => result.current.selectMembership("m1"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.step).toBe("branch");
    expect(storage.saveContext).toHaveBeenCalledWith("t1", null);
    api.fetchMe.mockResolvedValueOnce({ id: "u" });
    act(() => result.current.selectBranchForMembership("b2"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(onLogin).toHaveBeenCalled();
    api.fetchMe.mockRejectedValueOnce(new Error("fetch fail"));
    act(() => result.current.selectBranchForMembership("b1"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(toast).toHaveBeenCalled();
    act(() => result.current.resetToCredentials());
    expect(result.current.step).toBe("credentials");
  });
  it("covers membership activation error and branch selection without active membership", async () => {
    const { result } = renderHook(() => useLogin(vi.fn()));
    act(() => result.current.selectBranchForMembership("x"));
    api.login.mockResolvedValue({ accessToken: "t", user: {} });
    api.fetchMemberships.mockResolvedValue([
      {
        membershipId: "m",
        tenant: { id: "t" },
        branches: [{ id: "x", isActive: false }],
      },
      { membershipId: "n", tenant: { id: "n" }, branches: [{ id: "b" }] },
    ]);
    await act(async () => {
      await holder.mutationConfig.mutationFn({ email: "a", password: "b" });
    });
    act(() => result.current.selectMembership("m"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(toast).toHaveBeenCalled();
  });
});
