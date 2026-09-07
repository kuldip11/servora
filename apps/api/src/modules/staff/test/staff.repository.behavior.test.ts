import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  membershipFindMany: vi.fn(),
  membershipFindFirst: vi.fn(),
  roleFindFirst: vi.fn(),
  roleFindMany: vi.fn(),
  branchFindMany: vi.fn(),
  txUserFindFirst: vi.fn(),
  txMembershipFindFirst: vi.fn(),
  transaction: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  del: vi.fn(),
  deleteWhere: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
}));
vi.mock("@/db", () => {
  const tx: any = {
    query: {
      users: { findFirst: m.txUserFindFirst },
      tenantMemberships: { findFirst: m.txMembershipFindFirst },
    },
    insert: m.insert,
    delete: m.del,
    update: m.update,
  };
  m.transaction.mockImplementation(async (fn: Function) => fn(tx));
  m.insert.mockImplementation(() => ({ values: m.insertValues }));
  m.insertValues.mockImplementation(() => ({
    returning: m.insertReturning,
    then: Promise.resolve(undefined).then.bind(Promise.resolve(undefined)),
  }));
  m.del.mockImplementation(() => ({ where: m.deleteWhere }));
  m.update.mockImplementation(() => ({ set: m.updateSet }));
  m.updateSet.mockImplementation(() => ({ where: m.updateWhere }));
  m.updateWhere.mockImplementation(() => ({ returning: m.updateReturning }));
  return {
    db: {
      query: {
        tenantMemberships: {
          findMany: m.membershipFindMany,
          findFirst: m.membershipFindFirst,
        },
        roles: { findFirst: m.roleFindFirst, findMany: m.roleFindMany },
        branches: { findMany: m.branchFindMany },
      },
      transaction: m.transaction,
      update: m.update,
    },
  };
});
import { staffRepository } from "../staff.repository";
const memberships = [
  {
    id: "m1",
    user: { id: "u1", deletedAt: null, firstName: "A" },
    roles: [{ role: { id: "r1", scope: "TENANT" } }],
    branches: [
      { branchId: "b1", branch: { id: "b1" } },
      { branchId: "b2", branch: null },
    ],
  },
  {
    id: "m2",
    user: { id: "u2", deletedAt: null },
    roles: [{ role: { id: "r2", scope: "BRANCH" } }],
    branches: [{ branchId: "b2", branch: { id: "b2" } }],
  },
  { id: "m3", user: null, roles: [], branches: [] },
  {
    id: "m4",
    user: { id: "u4", deletedAt: new Date() },
    roles: [],
    branches: [],
  },
];
describe("staff repository comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.membershipFindMany.mockResolvedValue(memberships);
    m.membershipFindFirst.mockResolvedValue({ id: "m1" });
    m.roleFindFirst.mockResolvedValue({ id: "r1" });
    m.roleFindMany.mockResolvedValue([{ id: "r1" }]);
    m.branchFindMany.mockResolvedValue([{ id: "b1" }]);
    m.txUserFindFirst.mockResolvedValue({ id: "u1" });
    m.txMembershipFindFirst.mockResolvedValue(undefined);
    m.insertReturning.mockResolvedValue([
      { id: "new", userId: "u1", tenantId: "t1" },
    ]);
    m.deleteWhere.mockResolvedValue(undefined);
    m.updateReturning.mockResolvedValue([{ id: "u1" }]);
  });
  it("covers all staff list scoping modes/filter mapping/exclusion", async () => {
    await expect(
      staffRepository.findMany("t1", "b1", undefined, "none"),
    ).resolves.toHaveLength(1);
    await expect(
      staffRepository.findMany("t1", null, ["b2"], "none"),
    ).resolves.toHaveLength(2);
    await expect(
      staffRepository.findMany("t1", null, undefined, "u1"),
    ).resolves.toHaveLength(1);
  });
  it("covers membership/role/branch lookups including optional tenant and empty ids", async () => {
    await staffRepository.findMembership("t1", "u1");
    await staffRepository.findRoleById("r1", "t1");
    await staffRepository.findRoleById("r1");
    await expect(staffRepository.findBranchesByIds("t1", [])).resolves.toEqual(
      [],
    );
    await expect(
      staffRepository.findBranchesByIds("t1", ["b1"]),
    ).resolves.toEqual([{ id: "b1" }]);
  });
  it("creates staff from existing or new users and covers conflicts/failures/branch insert", async () => {
    await expect(
      staffRepository.create({
        tenantId: "t1",
        firstName: "A",
        lastName: "B",
        email: "a@x",
        passwordHash: "h",
        roleId: "r1",
        branchIds: ["b1", "b2"],
      }),
    ).resolves.toMatchObject({ id: "new" });
    m.txUserFindFirst.mockResolvedValueOnce(undefined);
    m.insertReturning
      .mockResolvedValueOnce([{ id: "newUser" }])
      .mockResolvedValueOnce([{ id: "mem", userId: "newUser" }]);
    await expect(
      staffRepository.create({
        tenantId: "t1",
        firstName: "A",
        lastName: "B",
        email: "a@x",
        passwordHash: "h",
        roleId: "r1",
        branchIds: [],
      }),
    ).resolves.toMatchObject({ id: "mem" });
    m.txUserFindFirst.mockResolvedValueOnce(undefined);
    m.insertReturning.mockResolvedValueOnce([]);
    await expect(
      staffRepository.create({
        tenantId: "t1",
        firstName: "A",
        lastName: "B",
        email: "a@x",
        passwordHash: "h",
        roleId: "r1",
        branchIds: [],
      }),
    ).rejects.toThrow("Staff creation failed");
    m.txUserFindFirst.mockResolvedValueOnce({ id: "u1" });
    m.txMembershipFindFirst.mockResolvedValueOnce({ id: "existing" });
    await expect(
      staffRepository.create({
        tenantId: "t1",
        firstName: "A",
        lastName: "B",
        email: "a@x",
        passwordHash: "h",
        roleId: "r1",
        branchIds: [],
      }),
    ).rejects.toThrow("already belongs");
    m.txUserFindFirst.mockResolvedValueOnce({ id: "u1" });
    m.txMembershipFindFirst.mockResolvedValueOnce(undefined);
    m.insertReturning.mockResolvedValueOnce([]);
    await expect(
      staffRepository.create({
        tenantId: "t1",
        firstName: "A",
        lastName: "B",
        email: "a@x",
        passwordHash: "h",
        roleId: "r1",
        branchIds: [],
      }),
    ).rejects.toThrow("membership creation failed");
  });
  it("covers update user/status and role replacement", async () => {
    await expect(
      staffRepository.updateUser("t1", "u1", { firstName: "N" }),
    ).resolves.toEqual({ id: "u1" });
    await expect(
      staffRepository.updateMembershipStatus("t1", "u1", "INACTIVE"),
    ).resolves.toEqual({ id: "u1" });
    await expect(staffRepository.setRole("m1", "r1")).resolves.toBeUndefined();
  });
  it("sets branches with/without rows, handles missing membership, soft deletes and lists roles", async () => {
    m.txMembershipFindFirst.mockResolvedValueOnce({ tenantId: "t1" });
    await staffRepository.setBranches("m1", ["b1"]);
    m.txMembershipFindFirst.mockResolvedValueOnce({ tenantId: "t1" });
    await staffRepository.setBranches("m1", []);
    m.txMembershipFindFirst.mockResolvedValueOnce(undefined);
    await expect(staffRepository.setBranches("missing", [])).rejects.toThrow(
      "Membership not found",
    );
    await expect(staffRepository.softDelete("t1", "u1")).resolves.toEqual({
      id: "u1",
    });
    await expect(staffRepository.findAllRoles("t1")).resolves.toEqual([
      { id: "r1" },
    ]);
  });
});
