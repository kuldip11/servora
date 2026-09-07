import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/lib/api-client";
import {
  fetchMemberships,
  login,
  resolveWaiterContext,
  restoreSession,
} from "@/features/auth/api/login";

vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("auth API", () => {
  it("posts credentials and returns login data", async () => {
    const payload = {
      accessToken: "a",
      expiresIn: 3600,
      user: { id: "u1" },
    };
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: payload },
    } as any);
    await expect(login("a@b.com", "secret")).resolves.toEqual(payload);
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.com",
      password: "secret",
    });
  });

  it("returns available memberships", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [{ id: "m1" }] },
    } as any);
    await expect(fetchMemberships()).resolves.toEqual([{ id: "m1" }]);
    expect(apiClient.get).toHaveBeenCalledWith("/auth/memberships");
  });

  it("restores a valid tenant and branch context before scoped requests", () => {
    const memberships = [
      {
        membershipId: "m1",
        tenant: { id: "t1", name: "Business 1" },
        roles: [],
        branches: [
          { id: "b1", name: "Branch 1", isActive: true },
          { id: "b2", name: "Branch 2", isActive: true },
        ],
      },
    ] as any;

    expect(resolveWaiterContext(memberships, "t1", "b2")).toEqual({
      tenantId: "t1",
      branchId: "b2",
    });
    expect(resolveWaiterContext(memberships, null, null)).toEqual({
      tenantId: "t1",
      branchId: "b1",
    });
  });
  it("returns null when no membership or active branch exists", () => {
    expect(resolveWaiterContext([], null, null)).toBeNull();
    expect(resolveWaiterContext([{ membershipId: "m", tenant: { id: "t", name: "T" }, roles: [], branches: [{ id: "b", name: "B", isActive: false }] }] as any, null, null)).toBeNull();
  });

  it("restores session and persists resolved context/profile", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { accessToken: "fresh", user: { id: "u" } } } } as any);
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { data: [{ membershipId: "m", tenant: { id: "t", name: "T" }, roles: [], branches: [{ id: "b", name: "B", isActive: true }] }] } } as any)
      .mockResolvedValueOnce({ data: { data: { id: "u", firstName: "A", lastName: "B", roles: [] } } } as any);
    await expect(restoreSession()).resolves.toBe(true);
    expect(localStorage.getItem("waiter_tenant")).toBe("t");
    expect(localStorage.getItem("waiter_branch")).toBe("b");
  });

  it("fails restore when no context can be resolved", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { accessToken: "fresh", user: { id: "u" } } } } as any);
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } } as any);
    await expect(restoreSession()).rejects.toThrow("No active branch");
  });

});
