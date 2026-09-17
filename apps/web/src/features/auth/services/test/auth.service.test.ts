import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));
import { authService } from "@/features/auth/services/auth.service";

const user = { id: "u1", tenantId: "t1", branchId: "b1" } as any;

describe("authService", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    localStorage.clear();
  });

  it("signs up and returns the user payload", async () => {
    api.post.mockResolvedValue({ data: { data: { user } } });
    await expect(
      authService.signup({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        password: "secret",
      }),
    ).resolves.toEqual({ user });
    expect(api.post).toHaveBeenCalledWith("/auth/signup", {
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      password: "secret",
    });
  });

  it("logs in", async () => {
    const data = { accessToken: "a", expiresIn: 60, user };
    api.post.mockResolvedValue({ data: { data } });
    await expect(
      authService.login({ email: "a@b.com", password: "secret" }),
    ).resolves.toEqual(data);
  });

  it("refreshes through the API-owned HttpOnly cookie", async () => {
    const data = { accessToken: "a2", expiresIn: 60, user };
    api.post.mockResolvedValue({ data: { data } });
    await expect(authService.refresh()).resolves.toEqual(data);
    expect(api.post).toHaveBeenCalledWith("/auth/refresh");
  });

  it("allows bootstrap refresh to override only its request timeout", async () => {
    const data = { accessToken: "a2", expiresIn: 60, user };
    api.post.mockResolvedValue({ data: { data } });

    await expect(authService.refresh({ timeout: 75_000 })).resolves.toEqual(
      data,
    );
    expect(api.post).toHaveBeenCalledWith("/auth/refresh", undefined, {
      timeout: 75_000,
    });
  });

  it("loads organizations and memberships, creates a tenant under an organization, and loads the current user", async () => {
    api.get.mockImplementation((url: string) => {
      if (url === "/auth/memberships")
        return Promise.resolve({ data: { data: ["m1"] } });
      if (url === "/organizations")
        return Promise.resolve({
          data: { data: [{ id: "o1", name: "Org", isActive: true }] },
        });
      return Promise.resolve({ data: { data: user } });
    });
    api.post.mockResolvedValue({
      data: {
        data: { tenant: { id: "t1", name: "Tenant" }, membershipId: "m1" },
      },
    });
    await expect(authService.memberships()).resolves.toEqual(["m1"]);
    await expect(authService.organizations()).resolves.toEqual([
      { id: "o1", name: "Org", isActive: true },
    ]);
    await expect(authService.createTenant("Tenant", "o1")).resolves.toEqual({
      tenant: { id: "t1", name: "Tenant" },
      membershipId: "m1",
    });
    await expect(authService.me()).resolves.toEqual(user);
    expect(api.post).toHaveBeenCalledWith("/tenants", {
      name: "Tenant",
      organizationId: "o1",
    });
    expect(api.get).toHaveBeenCalledWith("/auth/me");
  });
});

it("updates the authenticated profile", async () => {
  api.patch.mockResolvedValue({
    data: { data: { id: "u1", firstName: "New", lastName: "Name" } },
  });
  await expect(
    authService.updateProfile({ firstName: "New", lastName: "Name" }),
  ).resolves.toEqual({
    id: "u1",
    firstName: "New",
    lastName: "Name",
  });
  expect(api.patch).toHaveBeenCalledWith("/auth/me", {
    firstName: "New",
    lastName: "Name",
  });
});
