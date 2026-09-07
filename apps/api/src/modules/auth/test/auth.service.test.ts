import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  findStandaloneUserByEmail,
  createUserWithGlobalOwnerRole,
  findUserById,
  findUsersByEmail,
  consumeRefreshToken,
  saveRefreshToken,
  findMembershipById,
  updateUserProfile,
  updatePasswordHash,
  recordFailedLogin,
  resetLoginFailures,
  revokeRefreshToken,
  createSession,
  touchSession,
  findSession,
  listActiveSessions,
  revokeSession,
} = vi.hoisted(() => ({
  findStandaloneUserByEmail: vi.fn(),
  createUserWithGlobalOwnerRole: vi.fn(),
  findUserById: vi.fn(),
  findUsersByEmail: vi.fn(),
  consumeRefreshToken: vi.fn(),
  saveRefreshToken: vi.fn(),
  findMembershipById: vi.fn(),
  updateUserProfile: vi.fn(),
  updatePasswordHash: vi.fn(),
  recordFailedLogin: vi.fn(),
  resetLoginFailures: vi.fn(),
  revokeRefreshToken: vi.fn(),
  createSession: vi.fn(),
  touchSession: vi.fn(),
  findSession: vi.fn(),
  listActiveSessions: vi.fn(),
  revokeSession: vi.fn(),
}));
vi.mock("../auth.repository", () => ({
  authRepository: {
    findStandaloneUserByEmail,
    createUserWithGlobalOwnerRole,
    findUserById,
    findUsersByEmail,
    consumeRefreshToken,
    saveRefreshToken,
    findMembershipById,
    updateUserProfile,
    updatePasswordHash,
    recordFailedLogin,
    resetLoginFailures,
    revokeRefreshToken,
    createSession,
    touchSession,
    findSession,
    listActiveSessions,
    revokeSession,
  },
}));
const { listUserMemberships } = vi.hoisted(() => ({
  listUserMemberships: vi.fn(),
}));
vi.mock("../../../core/auth/membership-context", () => ({
  listUserMemberships,
}));
const { resolveMembership, resolveAuthorization } = vi.hoisted(() => ({
  resolveMembership: vi.fn(),
  resolveAuthorization: vi.fn(),
}));
vi.mock("../../../core/auth/authorization", () => ({
  resolveMembership,
  resolveAuthorization,
}));
const { signAccessToken } = vi.hoisted(() => ({
  signAccessToken: vi.fn().mockReturnValue("access"),
}));
vi.mock("../../../lib/jwt", () => ({ signAccessToken }));
vi.mock("../../../db", () => ({ db: {} }));
import { authService } from "@/modules/auth/auth.service";
const user: any = {
  id: "u1",
  firstName: "A",
  lastName: "B",
  email: "a@example.com",
  passwordHash: "hash",
  status: "ACTIVE",
  globalUserRoles: [
    {
      roleId: "r1",
      role: { name: "OWNER", description: "", rolePermissions: [] },
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  listUserMemberships.mockResolvedValue([]);
  resolveMembership.mockResolvedValue(undefined);
  resolveAuthorization.mockResolvedValue({
    allowed: false,
    permissionKeys: [],
    roleIds: [],
    branchIds: [],
    tenantWide: false,
  });
  createSession.mockResolvedValue({ id: "session-1" });
  touchSession.mockResolvedValue(undefined);
});
describe("auth service", () => {
  it("updates profile fields and returns the refreshed user", async () => {
    updateUserProfile.mockResolvedValue({
      ...user,
      firstName: "New",
      lastName: "Name",
    });
    findUserById.mockResolvedValue({
      ...user,
      firstName: "New",
      lastName: "Name",
    });
    await expect(
      authService.updateProfile("u1", { firstName: "New", lastName: "Name" }),
    ).resolves.toMatchObject({ firstName: "New", lastName: "Name" });
    expect(updateUserProfile).toHaveBeenCalledWith("u1", {
      firstName: "New",
      lastName: "Name",
    });
  });

  it("changes only the authenticated user's password after verifying the current password", async () => {
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash("current-pass", 4);
    findUserById.mockResolvedValue({ ...user, passwordHash });
    updatePasswordHash.mockResolvedValue({ id: "u1" });

    await expect(
      authService.changePassword("u1", {
        currentPassword: "wrong-pass",
        newPassword: "new-password-123",
      }),
    ).rejects.toThrow();
    expect(updatePasswordHash).not.toHaveBeenCalled();

    await expect(
      authService.changePassword("u1", {
        currentPassword: "current-pass",
        newPassword: "new-password-123",
      }),
    ).resolves.toBeUndefined();
    expect(updatePasswordHash).toHaveBeenCalledWith(
      "u1",
      expect.not.stringContaining("new-password-123"),
    );
  });

  it("rejects duplicate signup and bootstraps a new user", async () => {
    findStandaloneUserByEmail.mockResolvedValueOnce(user);
    await expect(
      authService.signup({
        email: "A@EXAMPLE.COM",
        password: "password123",
        firstName: "A",
        lastName: "B",
      } as any),
    ).rejects.toThrow("Account already exists");
    findStandaloneUserByEmail.mockResolvedValueOnce(undefined);
    createUserWithGlobalOwnerRole.mockResolvedValue({ user: { id: "u1" } });
    findUserById.mockResolvedValue(user);
    await expect(
      authService.signup({
        email: "A@EXAMPLE.COM",
        password: "password123",
        firstName: "A",
        lastName: "B",
      } as any),
    ).resolves.toMatchObject({
      user: { id: "u1", tenantId: "", branchId: null },
    });
    expect(createUserWithGlobalOwnerRole).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@example.com", firstName: "A" }),
    );
  });
  it("requires exactly one active password match for login", async () => {
    findUsersByEmail.mockResolvedValue([user]);
    await expect(
      authService.login({ email: "a@example.com", password: "wrong" } as any),
    ).rejects.toThrow("Invalid credentials");
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 1);
    findUsersByEmail.mockResolvedValue([{ ...user, passwordHash: hash }]);
    saveRefreshToken.mockResolvedValue({});
    await expect(
      authService.login({ email: "a@example.com", password: "secret" } as any),
    ).resolves.toMatchObject({ accessToken: "access", user: { id: "u1" } });
  });
  it("locks an account after five failed password attempts", async () => {
    findUsersByEmail.mockResolvedValue([
      { ...user, failedLoginAttempts: 4, lockedUntil: null },
    ]);
    await expect(
      authService.login({ email: "a@example.com", password: "wrong" } as any),
    ).rejects.toThrow("Too many failed login attempts");
    expect(recordFailedLogin).toHaveBeenCalledWith("u1", 5, expect.any(Date));
  });

  it("rejects an already locked account before checking the password", async () => {
    findUsersByEmail.mockResolvedValue([
      {
        ...user,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 60_000),
      },
    ]);
    await expect(
      authService.login({ email: "a@example.com", password: "secret" } as any),
    ).rejects.toThrow("Too many failed login attempts");
  });

  it("clears login failures after successful authentication", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 1);
    findUsersByEmail.mockResolvedValue([
      {
        ...user,
        passwordHash: hash,
        failedLoginAttempts: 2,
        lockedUntil: null,
      },
    ]);
    saveRefreshToken.mockResolvedValue({});
    await expect(
      authService.login({ email: "a@example.com", password: "secret" } as any),
    ).resolves.toMatchObject({ accessToken: "access" });
    expect(resetLoginFailures).toHaveBeenCalledWith("u1");
  });

  it("rejects a Chef account from the Web application", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 1);
    findUsersByEmail.mockResolvedValue([
      { ...user, passwordHash: hash, globalUserRoles: [] },
    ]);
    listUserMemberships.mockResolvedValue([
      { tenant: { id: "t1" }, roles: [{ name: "CHEF" }] },
    ]);
    resolveMembership.mockResolvedValue({
      id: "m1",
      tenantId: "t1",
      roles: [{ roleId: "chef", role: { name: "CHEF", isSystem: true } }],
      branches: [],
    });
    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: [
        "kitchen:read",
        "kitchen:update",
        "menu:read",
        "orders:read",
      ],
      roleIds: ["chef"],
      branchIds: ["b1"],
      tenantWide: false,
    });

    await expect(
      authService.login(
        { email: "a@example.com", password: "secret" } as any,
        "web",
      ),
    ).rejects.toThrow("Account does not have access to this application");
  });

  it("allows the same Chef account to authenticate to Kitchen", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 1);
    findUsersByEmail.mockResolvedValue([
      { ...user, passwordHash: hash, globalUserRoles: [] },
    ]);
    listUserMemberships.mockResolvedValue([
      { tenant: { id: "t1" }, roles: [{ name: "CHEF" }] },
    ]);
    resolveMembership.mockResolvedValue({
      id: "m1",
      tenantId: "t1",
      roles: [{ roleId: "chef", role: { name: "CHEF", isSystem: true } }],
      branches: [],
    });
    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: [
        "kitchen:read",
        "kitchen:update",
        "menu:read",
        "orders:read",
      ],
      roleIds: ["chef"],
      branchIds: ["b1"],
      tenantWide: false,
    });
    saveRefreshToken.mockResolvedValue({});

    await expect(
      authService.login(
        { email: "a@example.com", password: "secret" } as any,
        "kitchen",
      ),
    ).resolves.toMatchObject({ accessToken: "access" });
    expect(signAccessToken).toHaveBeenCalledWith(expect.any(Object), "kitchen");
  });

  it("revokes the refresh token on logout", async () => {
    revokeRefreshToken.mockResolvedValue({
      id: "rt1",
      userId: "u1",
      sessionId: "session-1",
    });
    revokeSession.mockResolvedValue({ id: "session-1" });
    await expect(authService.logout("refresh-token")).resolves.toEqual({
      loggedOut: true,
    });
    expect(revokeRefreshToken).toHaveBeenCalledWith(expect.any(String));
  });

  it("binds refresh tokens to their issuing application", async () => {
    await expect(authService.refresh("kitchen.token", "web")).rejects.toThrow(
      "Invalid refresh token",
    );
    expect(consumeRefreshToken).not.toHaveBeenCalled();

    consumeRefreshToken.mockResolvedValue({
      userId: "u1",
      sessionId: "session-1",
    });
    findSession.mockResolvedValue({
      id: "session-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    findUserById.mockResolvedValue(user);
    saveRefreshToken.mockResolvedValue({});

    const result = await authService.refresh("kitchen.token", "kitchen");
    expect(result.refreshToken).toMatch(/^kitchen\./);
    expect(signAccessToken).toHaveBeenCalledWith(expect.any(Object), "kitchen");
  });

  it("consumes refresh tokens atomically and rejects invalid users/tokens", async () => {
    consumeRefreshToken.mockResolvedValue(undefined);
    await expect(authService.refresh("token")).rejects.toThrow(
      "Invalid refresh token",
    );
    consumeRefreshToken.mockResolvedValue({
      userId: "u1",
      sessionId: "session-1",
    });
    findSession.mockResolvedValue({
      id: "session-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    findUserById.mockResolvedValue(undefined);
    await expect(authService.refresh("token")).rejects.toThrow(
      "Invalid refresh token",
    );
  });
  it("enforces membership ownership/status and lists memberships", async () => {
    findUserById.mockResolvedValue(user);
    findMembershipById.mockResolvedValue({
      id: "m1",
      userId: "u2",
      status: "ACTIVE",
    });
    await expect(authService.me("u1", "m1")).rejects.toThrow(
      "Membership access denied",
    );
    findMembershipById.mockResolvedValue({
      id: "m1",
      userId: "u1",
      status: "ACTIVE",
    });
    await expect(authService.me("u1", "m1")).resolves.toMatchObject({
      membership: { id: "m1" },
    });
    const listed = {
      membershipId: "m1",
      tenant: { id: "t1", name: "Tenant" },
      roles: [{ id: "admin", name: "FRANCHISE_ADMIN", scope: "TENANT" }],
      branches: [],
    };
    listUserMemberships.mockResolvedValue([listed]);
    resolveMembership.mockResolvedValue({
      id: "m1",
      tenantId: "t1",
      roles: [
        { roleId: "admin", role: { name: "FRANCHISE_ADMIN", isSystem: true } },
      ],
      branches: [],
    });
    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: ["staff:read"],
      roleIds: ["admin"],
      branchIds: [],
      tenantWide: true,
    });
    await expect(authService.memberships("u1")).resolves.toEqual([listed]);
  });
});

describe("auth service edge coverage", () => {
  it("covers signup lookup failure and role-description fallback", async () => {
    findStandaloneUserByEmail.mockResolvedValue(undefined);
    createUserWithGlobalOwnerRole.mockResolvedValue({ user: { id: "u1" } });
    findUserById.mockResolvedValueOnce(undefined);
    await expect(authService.signup({ email: "x@example.com", password: "password123", firstName: "A", lastName: "B" } as any)).rejects.toThrow("User creation failed");
    findUserById.mockResolvedValueOnce({ ...user, globalUserRoles: [{ roleId: "r1", role: { name: "OWNER", description: null, rolePermissions: [] } }] });
    await expect(authService.signup({ email: "x@example.com", password: "password123", firstName: "A", lastName: "B" } as any)).resolves.toMatchObject({ user: { roles: [{ description: "" }] } });
  });

  it("rejects duplicate/missing/inactive login users and exercises unlocked failure", async () => {
    findUsersByEmail.mockResolvedValueOnce([]);
    await expect(authService.login({ email: "x", password: "p" } as any)).rejects.toThrow("Invalid credentials");
    findUsersByEmail.mockResolvedValueOnce([user, user]);
    await expect(authService.login({ email: "x", password: "p" } as any)).rejects.toThrow("Invalid credentials");
    findUsersByEmail.mockResolvedValueOnce([{ ...user, status: "INACTIVE" }]);
    await expect(authService.login({ email: "x", password: "p" } as any)).rejects.toThrow("Invalid credentials");
    findUsersByEmail.mockResolvedValueOnce([{ ...user, failedLoginAttempts: 1, lockedUntil: null }]);
    await expect(authService.login({ email: "x", password: "wrong" } as any)).rejects.toThrow("Invalid credentials");
    expect(recordFailedLogin).toHaveBeenLastCalledWith("u1", 2, null);
  });

  it("covers membership access early denials and role-id fallbacks", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("secret", 1);
    const noGlobal = { ...user, passwordHash: hash, globalUserRoles: [] };
    findUsersByEmail.mockResolvedValue(noGlobal ? [noGlobal] : []);
    listUserMemberships.mockResolvedValue([{ tenant: { id: "t1" } }]);
    resolveMembership.mockResolvedValueOnce(undefined);
    await expect(authService.login({ email: "x", password: "secret" } as any, "web")).rejects.toThrow("Account does not have access");

    resolveMembership.mockResolvedValueOnce({ id: "m1", tenantId: "t1", roles: [], branches: [] });
    resolveAuthorization.mockResolvedValueOnce({ allowed: false, permissionKeys: [], roleIds: [], branchIds: [], tenantWide: false });
    await expect(authService.login({ email: "x", password: "secret" } as any, "web")).rejects.toThrow("Account does not have access");

    resolveMembership.mockResolvedValueOnce({ id: "m1", tenantId: "t1", roles: [{ roleId: "custom", role: null }], branches: [] });
    resolveAuthorization.mockResolvedValueOnce({ allowed: true, permissionKeys: ["analytics:read"], roleIds: ["custom"], branchIds: [], tenantWide: false });
    saveRefreshToken.mockResolvedValue({});
    await expect(authService.login({ email: "x", password: "secret" } as any, "web")).resolves.toMatchObject({ accessToken: "access" });
  });

  it("covers logout without a session and session list/revoke behavior", async () => {
    revokeRefreshToken.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: "rt", userId: "u1", sessionId: null });
    await authService.logout("a"); await authService.logout("b"); expect(revokeSession).not.toHaveBeenCalled();
    listActiveSessions.mockResolvedValue([{ id: "s1" }]);
    await expect(authService.sessions("u1")).resolves.toEqual([{ id: "s1" }]);
    revokeSession.mockResolvedValueOnce(undefined);
    await expect(authService.revokeSession("u1", "s0")).rejects.toThrow("Session not found");
    revokeSession.mockResolvedValueOnce({ id: "s1" });
    await expect(authService.revokeSession("u1", "s1")).resolves.toEqual({ revoked: true });
  });

  it("covers every invalid refresh-session state", async () => {
    consumeRefreshToken.mockResolvedValueOnce(undefined);
    await expect(authService.refresh("web.x", "web")).rejects.toThrow("Invalid refresh token");
    consumeRefreshToken.mockResolvedValueOnce({ userId: "u1", sessionId: null }); findUserById.mockResolvedValueOnce(user);
    await expect(authService.refresh("web.x", "web")).rejects.toThrow("Invalid refresh token");
    for (const session of [undefined, { id: "s", revokedAt: new Date(), expiresAt: new Date(Date.now()+10000) }, { id: "s", revokedAt: null, expiresAt: new Date(Date.now()-1000) }]) {
      consumeRefreshToken.mockResolvedValueOnce({ userId: "u1", sessionId: "s" }); findUserById.mockResolvedValueOnce(user); findSession.mockResolvedValueOnce(session);
      await expect(authService.refresh("web.x", "web")).rejects.toThrow("Invalid refresh token");
    }
  });

  it("covers me without membership and all invalid membership states", async () => {
    findUserById.mockResolvedValueOnce(undefined);
    await expect(authService.me("u1")).rejects.toThrow();
    findUserById.mockResolvedValue(user);
    await expect(authService.me("u1")).resolves.toEqual({ user, membership: undefined });
    for (const membership of [undefined, { id: "m", userId: "u2", status: "ACTIVE" }, { id: "m", userId: "u1", status: "INACTIVE" }]) {
      findMembershipById.mockResolvedValueOnce(membership);
      await expect(authService.me("u1", "m")).rejects.toThrow("Membership access denied");
    }
  });

  it("filters inaccessible memberships and covers allowed custom membership", async () => {
    const memberships = [{ membershipId: "m1", tenant: { id: "t1" } }, { membershipId: "m2", tenant: { id: "t2" } }, { membershipId: "m3", tenant: { id: "t3" } }];
    listUserMemberships.mockResolvedValue(memberships);
    resolveMembership.mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "m2", roles: [], branches: [] })
      .mockResolvedValueOnce({ id: "m3", roles: [{ roleId: "c", role: null }], branches: [] });
    resolveAuthorization.mockResolvedValueOnce({ allowed: false, permissionKeys: [], roleIds: [], branchIds: [], tenantWide: false })
      .mockResolvedValueOnce({ allowed: true, permissionKeys: ["analytics:read"], roleIds: ["c"], branchIds: [], tenantWide: false });
    await expect(authService.memberships("u1", "web")).resolves.toEqual([memberships[2]]);
  });

  it("covers profile no-op and missing update", async () => {
    findUserById.mockResolvedValue(user);
    await expect(authService.updateProfile("u1", {})).resolves.toEqual(user);
    updateUserProfile.mockResolvedValueOnce(undefined);
    await expect(authService.updateProfile("u1", { firstName: "X" })).rejects.toThrow();
  });

  it("covers password user-not-found, same-password and failed-update paths", async () => {
    findUserById.mockResolvedValueOnce(undefined);
    await expect(authService.changePassword("u1", { currentPassword: "a", newPassword: "b" })).rejects.toThrow();
    const bcrypt = await import("bcryptjs"); const hash = await bcrypt.default.hash("same", 1);
    findUserById.mockResolvedValueOnce({ ...user, passwordHash: hash });
    await expect(authService.changePassword("u1", { currentPassword: "same", newPassword: "same" })).rejects.toThrow("New password must be different");
    findUserById.mockResolvedValueOnce({ ...user, passwordHash: hash }); updatePasswordHash.mockResolvedValueOnce(undefined);
    await expect(authService.changePassword("u1", { currentPassword: "same", newPassword: "different" })).rejects.toThrow();
  });

  it("covers direct token issuance null user, existing session and role-description fallback", async () => {
    await expect(authService._issueTokens(undefined as any)).rejects.toThrow("User not found");
    saveRefreshToken.mockResolvedValue({}); touchSession.mockResolvedValue(undefined);
    await expect(authService._issueTokens({ ...user, globalUserRoles: [{ roleId: "r1", role: { name: "OWNER", description: null, rolePermissions: [] } }] }, "web", "existing")).resolves.toMatchObject({ sessionId: "existing", user: { roles: [{ description: "" }] } });
    expect(touchSession).toHaveBeenCalledWith("existing", expect.any(Date));
  });
});
