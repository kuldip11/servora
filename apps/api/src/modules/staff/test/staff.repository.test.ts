import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  tenantMemberships,
  roles,
  branches,
  membershipBranches,
  membershipRoles,
  users,
} = vi.hoisted(() => ({
  tenantMemberships: {
    tenantId: "tenantId",
    status: "status",
    userId: "userId",
    id: "id",
  },
  roles: { id: "id" },
  branches: { tenantId: "tenantId", id: "id", isActive: "isActive" },
  membershipBranches: { membershipId: "membershipId" },
  membershipRoles: { membershipId: "membershipId" },
  users: { email: "email", id: "id", deletedAt: "deletedAt" },
}));
vi.mock("../../../db/schema", () => ({
  tenantMemberships,
  roles,
  branches,
  membershipBranches,
  membershipRoles,
  users,
}));
const { findMany, findFirst, db } = vi.hoisted(() => {
  const findMany = vi.fn(),
    findFirst = vi.fn();
  const query = {
    tenantMemberships: { findMany, findFirst },
    roles: { findFirst, findMany },
    branches: { findMany },
  };
  const transaction = vi.fn(async (cb: any) =>
    cb({
      query,
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "new" }]),
        }),
      }),
      delete: vi
        .fn()
        .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "u1" }]),
          }),
        }),
      }),
    }),
  );
  const db = {
    query,
    transaction,
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "u1" }]),
        }),
      }),
    }),
  };
  return { findMany, findFirst, query, transaction, db };
});
vi.mock("../../../db", () => ({ db }));
import { staffRepository } from "@/modules/staff/staff.repository";
beforeEach(() => {
  vi.clearAllMocks();
});
describe("staff repository", () => {
  it("scopes and maps staff memberships while omitting deleted users", async () => {
    findMany.mockResolvedValue([
      {
        id: "m1",
        user: { id: "u1", deletedAt: null },
        roles: [{ role: { name: "CASHIER" } }],
        branches: [{ branchId: "b1", branch: { id: "b1" } }],
      },
      {
        id: "m2",
        user: { id: "u2", deletedAt: new Date() },
        roles: [],
        branches: [],
      },
    ]);
    await expect(staffRepository.findMany("t1", "b1", ["b1"])).resolves.toEqual(
      [
        {
          id: "u1",
          deletedAt: null,
          membershipId: "m1",
          roles: [{ name: "CASHIER" }],
          assignedBranches: [{ id: "b1" }],
        },
      ],
    );
  });
  it("returns empty branch lookup without querying and maps role/membership lookups", async () => {
    await expect(staffRepository.findBranchesByIds("t1", [])).resolves.toEqual(
      [],
    );
    findFirst
      .mockResolvedValueOnce({ id: "r1", name: "CASHIER" })
      .mockResolvedValueOnce({ id: "m1" });
    await expect(staffRepository.findRoleById("r1")).resolves.toEqual({
      id: "r1",
      name: "CASHIER",
    });
    await expect(staffRepository.findMembership("t1", "u1")).resolves.toEqual({
      id: "m1",
    });
  });
  it("maps user and membership status updates through the database boundary", async () => {
    expect(
      await staffRepository.updateGlobalUserProfile("u1", {
        firstName: "New",
      }),
    ).toEqual({ id: "u1" });
    expect(db.update).toHaveBeenCalled();
  });
});
