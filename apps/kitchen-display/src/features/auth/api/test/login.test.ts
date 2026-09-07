import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: mocks.get, post: mocks.post },
}));

import {
  fetchMemberships,
  login,
  restoreSession,
  refreshSession,
  logoutSession,
} from "@/features/auth/api/login";

describe("auth api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in", async () => {
    mocks.post.mockResolvedValue({ data: { data: { accessToken: "a" } } });
    await expect(login("a@b.com", "pw")).resolves.toEqual({ accessToken: "a" });
    expect(mocks.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.com",
      password: "pw",
    });
  });

  it("restores, refreshes, and logs out sessions", async () => {
    mocks.post.mockResolvedValue({
      data: { data: { accessToken: "restored" } },
    });
    mocks.get.mockResolvedValue({ data: { data: { id: "u1" } } });
    sessionStorage.clear();
    await expect(restoreSession()).resolves.toBe(true);
    expect(sessionStorage.getItem("kds_token")).toBeNull();
    expect(mocks.post).toHaveBeenCalledWith("/auth/refresh");
    expect(mocks.get).toHaveBeenCalledWith("/auth/me");

    mocks.post.mockClear();
    await refreshSession();
    expect(mocks.post).toHaveBeenCalledWith("/auth/refresh");
    mocks.post.mockResolvedValue({ data: { data: undefined } });
    await logoutSession();
    expect(mocks.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("fetches memberships", async () => {
    mocks.get.mockResolvedValue({ data: { data: [{ membershipId: "m" }] } });
    await expect(fetchMemberships()).resolves.toEqual([{ membershipId: "m" }]);
    expect(mocks.get).toHaveBeenCalledWith("/auth/memberships");
  });
});
