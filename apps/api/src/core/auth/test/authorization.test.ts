import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/core/errors";
import type { Database } from "@/db";
import {
  hasPermission,
  requireBranchAccess,
  requirePermission,
  resolveAuthorization,
  resolveMembership,
} from "@/core/auth/authorization";

const makeDb = (
  membership: any,
  globalRoles: any[] = [],
  branch: any = { id: "b1" },
  rows: any[] = [{ key: "orders:read" }],
) =>
  ({
    query: {
      tenantMemberships: { findFirst: vi.fn().mockResolvedValue(membership) },
      globalUserRoles: { findMany: vi.fn().mockResolvedValue(globalRoles) },
      branches: { findFirst: vi.fn().mockResolvedValue(branch) },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
      })),
    })),
  }) as unknown as Database;

const membership = {
  id: "m1",
  roles: [{ roleId: "r1", role: { scope: "BRANCH" } }],
  branches: [{ branchId: "b1" }],
};

describe("authorization", () => {
  it("does not query PostgreSQL for an empty tenant id", async () => {
    const db = { query: { tenantMemberships: { findFirst: vi.fn() } } };
    expect(
      await resolveMembership(db as unknown as Database, "u1", ""),
    ).toBeUndefined();
    expect(db.query.tenantMemberships.findFirst).not.toHaveBeenCalled();
  });
  it("resolves membership authorization and permissions", async () => {
    const db = makeDb(membership);
    const decision = await resolveAuthorization(db, {
      userId: "u1",
      tenantId: "t1",
      branchId: "b1",
    });
    expect(decision).toMatchObject({
      allowed: true,
      membershipId: "m1",
      roleIds: ["r1"],
      permissionKeys: ["orders:read"],
      branchIds: ["b1"],
      tenantWide: false,
    });
  });
  it("denies a branch outside the membership assignments", async () => {
    const db = makeDb(membership, [], { id: "b2" });
    expect(
      (
        await resolveAuthorization(db, {
          userId: "u1",
          tenantId: "t1",
          branchId: "b2",
        })
      ).allowed,
    ).toBe(false);
  });
  it("does not let a global role widen an unrelated tenant membership", async () => {
    const global = [
      {
        roleId: "owner",
        role: {
          scope: "GLOBAL",
          rolePermissions: [{ permission: { key: "orders:void" } }],
        },
      },
    ];
    const db = makeDb(membership, global, { id: "b2" }, [
      { key: "orders:read" },
    ]);
    const decision = await resolveAuthorization(db, {
      userId: "u1",
      tenantId: "t1",
      branchId: "b2",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.tenantWide).toBe(false);
    expect(decision.permissionKeys).toEqual([]);
  });

  it("allows a tenant-scoped membership role across its tenant branches", async () => {
    const tenantMembership = {
      ...membership,
      roles: [{ roleId: "admin", role: { scope: "TENANT" } }],
      branches: [],
    };
    const decision = await resolveAuthorization(
      makeDb(tenantMembership, [], { id: "b2" }),
      { userId: "u1", tenantId: "t1", branchId: "b2" },
    );
    expect(decision.allowed).toBe(true);
    expect(decision.tenantWide).toBe(true);
  });
  it("returns false for missing membership or roles", async () => {
    expect(
      (
        await resolveAuthorization(makeDb(undefined), {
          userId: "u1",
          tenantId: "t1",
        })
      ).allowed,
    ).toBe(false);
    expect(
      (
        await resolveAuthorization(
          makeDb({ ...membership, roles: [], branches: [] }),
          { userId: "u1", tenantId: "t1" },
        )
      ).allowed,
    ).toBe(false);
  });
  it("checks permissions and throws a typed forbidden error when denied", async () => {
    const db = makeDb(membership);
    expect(
      await hasPermission(db, { userId: "u1", tenantId: "t1" }, "orders:read"),
    ).toBe(true);
    await expect(
      requirePermission(db, { userId: "u1", tenantId: "t1" }, "orders:write"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
  it("requires access to a specific branch", async () => {
    const db = makeDb(membership);
    await expect(
      requireBranchAccess(db, { userId: "u1", tenantId: "t1" }, "b1"),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      requireBranchAccess(
        makeDb(membership, [], undefined),
        { userId: "u1", tenantId: "t1" },
        "b9",
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
