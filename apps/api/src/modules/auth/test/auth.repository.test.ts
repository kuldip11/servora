import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  membershipFindFirst: vi.fn(),
  roleFindFirst: vi.fn(),
  sessionFindFirst: vi.fn(),
  sessionFindMany: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  insertConflict: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  transaction: vi.fn(),
  txInsert: vi.fn(),
  txValues: vi.fn(),
  txReturning: vi.fn(),
  txConflict: vi.fn(),
  txRoleFindFirst: vi.fn(),
  txSelect: vi.fn(),
  txFrom: vi.fn(),
}));

vi.mock("../../../db", () => {
  const tx = {
    query: { roles: { findFirst: m.txRoleFindFirst } },
    insert: m.txInsert,
    select: m.txSelect,
  };
  m.transaction.mockImplementation(
    async (fn: (transaction: unknown) => unknown) => fn(tx),
  );
  m.insert.mockImplementation(() => ({ values: m.insertValues }));
  m.insertValues.mockImplementation(() => ({
    returning: m.insertReturning,
    onConflictDoNothing: m.insertConflict,
  }));
  m.update.mockImplementation(() => ({ set: m.updateSet }));
  m.updateSet.mockImplementation(() => ({ where: m.updateWhere }));
  m.updateWhere.mockImplementation(() => ({ returning: m.updateReturning }));
  m.txInsert.mockImplementation(() => ({ values: m.txValues }));
  m.txValues.mockImplementation(() => ({
    returning: m.txReturning,
    onConflictDoNothing: m.txConflict,
  }));
  m.txSelect.mockImplementation(() => ({ from: m.txFrom }));
  return {
    db: {
      query: {
        users: { findFirst: m.userFindFirst, findMany: m.userFindMany },
        tenantMemberships: { findFirst: m.membershipFindFirst },
        roles: { findFirst: m.roleFindFirst },
        userSessions: {
          findFirst: m.sessionFindFirst,
          findMany: m.sessionFindMany,
        },
      },
      insert: m.insert,
      update: m.update,
      transaction: m.transaction,
    },
  };
});

import { authRepository } from "@/modules/auth/auth.repository";

beforeEach(() => {
  vi.clearAllMocks();
  m.insertConflict.mockResolvedValue(undefined);
  m.txConflict.mockResolvedValue(undefined);
  m.txFrom.mockResolvedValue([{ id: "p1" }]);
});

describe("auth repository", () => {
  it("creates and updates users and login state", async () => {
    m.insertReturning.mockResolvedValueOnce([{ id: "u1" }]);
    await expect(
      authRepository.createUser({
        firstName: "A",
        lastName: "B",
        email: " A@Example.COM ",
        passwordHash: "h",
      }),
    ).resolves.toEqual({ id: "u1" });
    expect(m.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@example.com" }),
    );

    m.updateReturning.mockResolvedValueOnce([{ id: "u1", firstName: "N" }]);
    await expect(
      authRepository.updateUserProfile("u1", {
        firstName: "N",
        displayName: null,
      }),
    ).resolves.toMatchObject({ id: "u1" });
    m.updateReturning.mockResolvedValueOnce([{ id: "u1" }]);
    await expect(
      authRepository.updatePasswordHash("u1", "new"),
    ).resolves.toEqual({ id: "u1" });
    m.updateReturning.mockResolvedValueOnce([
      { failedLoginAttempts: 2, lockedUntil: null },
    ]);
    await expect(
      authRepository.recordFailedLogin("u1", 2, null),
    ).resolves.toEqual({ failedLoginAttempts: 2, lockedUntil: null });
    await authRepository.resetLoginFailures("u1");
  });

  it("covers user, membership and role lookups", async () => {
    m.userFindFirst.mockResolvedValue({ id: "u1" });
    await expect(
      authRepository.findStandaloneUserByEmail(" X@TEST.COM "),
    ).resolves.toEqual({ id: "u1" });
    await expect(
      authRepository.findUserByEmail(" X@TEST.COM "),
    ).resolves.toEqual({ id: "u1" });
    await expect(authRepository.findUserById("u1")).resolves.toEqual({
      id: "u1",
    });
    m.userFindMany.mockResolvedValue([{ id: "u1" }]);
    await expect(
      authRepository.findUsersByEmail(" X@TEST.COM "),
    ).resolves.toHaveLength(1);
    m.membershipFindFirst.mockResolvedValue({ id: "m1" });
    await expect(authRepository.findMembershipById("m1")).resolves.toEqual({
      id: "m1",
    });
    await expect(
      authRepository.findMembershipByUserAndTenant("u1", "t1"),
    ).resolves.toEqual({ id: "m1" });
    m.roleFindFirst.mockResolvedValue({ id: "r1" });
    await expect(authRepository.findRoleByName("OWNER")).resolves.toEqual({
      id: "r1",
    });
  });

  it("provisions a global owner with an existing role", async () => {
    m.txReturning.mockResolvedValueOnce([{ id: "u1" }]);
    m.txRoleFindFirst.mockResolvedValueOnce({ id: "r1" });
    await expect(
      authRepository.createUserWithGlobalOwnerRole({
        firstName: "A",
        lastName: "B",
        email: " A@X.COM ",
        passwordHash: "h",
      }),
    ).resolves.toEqual({ user: { id: "u1" }, role: { id: "r1" } });
    expect(m.txValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.com" }),
    );
    expect(m.txConflict).toHaveBeenCalledTimes(2);
  });

  it("creates the owner role and covers provisioning failures", async () => {
    m.txReturning
      .mockResolvedValueOnce([{ id: "u1" }])
      .mockResolvedValueOnce([{ id: "r1" }]);
    m.txRoleFindFirst.mockResolvedValueOnce(undefined);
    await expect(
      authRepository.createUserWithGlobalOwnerRole({
        firstName: "A",
        lastName: "B",
        email: "a@x.com",
        passwordHash: "h",
      }),
    ).resolves.toMatchObject({ role: { id: "r1" } });

    m.txReturning.mockResolvedValueOnce([]);
    await expect(
      authRepository.createUserWithGlobalOwnerRole({
        firstName: "A",
        lastName: "B",
        email: "a@x.com",
        passwordHash: "h",
      }),
    ).rejects.toThrow("User creation failed");

    m.txReturning
      .mockResolvedValueOnce([{ id: "u2" }])
      .mockResolvedValueOnce([]);
    m.txRoleFindFirst.mockResolvedValueOnce(undefined);
    await expect(
      authRepository.createUserWithGlobalOwnerRole({
        firstName: "A",
        lastName: "B",
        email: "b@x.com",
        passwordHash: "h",
      }),
    ).rejects.toThrow("Unable to provision GLOBAL OWNER role");

    m.txReturning.mockResolvedValueOnce([{ id: "u3" }]);
    m.txRoleFindFirst.mockResolvedValueOnce({ id: "r1" });
    m.txFrom.mockResolvedValueOnce([]);
    await expect(
      authRepository.createUserWithGlobalOwnerRole({
        firstName: "A",
        lastName: "B",
        email: "c@x.com",
        passwordHash: "h",
      }),
    ).rejects.toThrow("RBAC reference data");
  });

  it("ensures the global owner role for existing and new roles and handles failures", async () => {
    m.txRoleFindFirst.mockResolvedValueOnce({ id: "r1" });
    await expect(authRepository.ensureGlobalOwnerRole()).resolves.toEqual({
      id: "r1",
    });

    m.txRoleFindFirst.mockResolvedValueOnce(undefined);
    m.txReturning.mockResolvedValueOnce([{ id: "r2" }]);
    await expect(authRepository.ensureGlobalOwnerRole()).resolves.toEqual({
      id: "r2",
    });

    m.txRoleFindFirst.mockResolvedValueOnce(undefined);
    m.txReturning.mockResolvedValueOnce([]);
    await expect(authRepository.ensureGlobalOwnerRole()).rejects.toThrow(
      "Unable to provision GLOBAL OWNER role",
    );

    m.txRoleFindFirst.mockResolvedValueOnce({ id: "r1" });
    m.txFrom.mockResolvedValueOnce([]);
    await expect(authRepository.ensureGlobalOwnerRole()).rejects.toThrow(
      "RBAC reference data",
    );
  });

  it("assigns roles and covers refresh-token lifecycle", async () => {
    await authRepository.assignRole("u1", "r1");
    expect(m.insertConflict).toHaveBeenCalled();
    m.insertReturning.mockResolvedValueOnce([{ id: "rt1" }]);
    await expect(
      authRepository.saveRefreshToken({
        userId: "u1",
        membershipId: "m1",
        sessionId: "s1",
        tokenHash: "h",
        expiresAt: new Date(),
      }),
    ).resolves.toEqual({ id: "rt1" });
    m.updateReturning.mockResolvedValueOnce([
      { id: "rt1", sessionId: "s1", userId: "u1" },
    ]);
    await expect(authRepository.revokeRefreshToken("h")).resolves.toMatchObject(
      { id: "rt1" },
    );
    m.updateReturning.mockResolvedValueOnce([{ id: "rt2" }]);
    await expect(authRepository.consumeRefreshToken("h2")).resolves.toEqual({
      id: "rt2",
    });
  });

  it("covers session lifecycle including revoke with and without a row", async () => {
    m.insertReturning.mockResolvedValueOnce([{ id: "s1" }]);
    await expect(
      authRepository.createSession({
        userId: "u1",
        expiresAt: new Date(),
        userAgent: "ua",
        ipAddress: "ip",
      }),
    ).resolves.toEqual({ id: "s1" });
    m.sessionFindFirst.mockResolvedValueOnce({ id: "s1" });
    await expect(authRepository.findSession("u1", "s1")).resolves.toEqual({
      id: "s1",
    });
    m.sessionFindMany.mockResolvedValueOnce([{ id: "s1" }]);
    await expect(authRepository.listActiveSessions("u1")).resolves.toEqual([
      { id: "s1" },
    ]);
    const call = m.sessionFindMany.mock.calls[0]![0];
    const desc = vi.fn((v) => v);
    expect(call.orderBy({ lastSeenAt: "last" }, { desc })).toEqual(["last"]);
    await authRepository.touchSession("s1", new Date());

    m.updateReturning.mockResolvedValueOnce([{ id: "s1" }]);
    await expect(authRepository.revokeSession("u1", "s1")).resolves.toEqual({
      id: "s1",
    });
    expect(m.update).toHaveBeenCalledTimes(3);
    m.updateReturning.mockResolvedValueOnce([]);
    await expect(
      authRepository.revokeSession("u1", "missing"),
    ).resolves.toBeUndefined();
  });
});
