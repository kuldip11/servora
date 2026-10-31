import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  findMany,
  findMembership,
  findRoleById,
  findBranchesByIds,
  create,
  updateGlobalUserProfile,
  updateMembershipStatus,
  setRole,
  setBranches,
  softDelete,
  findAllRoles,
} = vi.hoisted(() => ({
  findMany: vi.fn(),
  findMembership: vi.fn(),
  findRoleById: vi.fn(),
  findBranchesByIds: vi.fn(),
  create: vi.fn(),
  updateGlobalUserProfile: vi.fn(),
  updateMembershipStatus: vi.fn(),
  setRole: vi.fn(),
  setBranches: vi.fn(),
  softDelete: vi.fn(),
  findAllRoles: vi.fn(),
}));
vi.mock("../staff.repository", () => ({
  staffRepository: {
    findMany,
    findMembership,
    findRoleById,
    findBranchesByIds,
    create,
    updateGlobalUserProfile,
    updateMembershipStatus,
    setRole,
    setBranches,
    softDelete,
    findAllRoles,
  },
}));
const { writeAudit } = vi.hoisted(() => ({ writeAudit: vi.fn() }));
vi.mock("../../../core/audit", () => ({ writeAudit }));
vi.mock("../../../core/auth", () => ({
  requirePermission: (auth: any, p: string) => {
    if (!(auth.permissions ?? []).includes(p))
      throw new Error(`Missing permission: ${p}`);
  },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("HASH") },
}));
import { staffService } from "@/modules/staff/staff.service";
const base: any = {
  userId: "admin",
  tenantId: "t1",
  branchId: "b1",
  email: "a@x.com",
  roles: ["OWNER"],
  permissions: [],
  tenantWide: true,
  authorizedBranchIds: ["b1"],
};
const membership: any = {
  id: "m1",
  userId: "u2",
  branches: [{ branchId: "b1" }],
  roles: [{ role: { id: "r1", name: "CASHIER", scope: "BRANCH" } }],
};
beforeEach(() => {
  vi.clearAllMocks();
  findRoleById.mockResolvedValue({
    id: "r1",
    name: "CASHIER",
    scope: "BRANCH",
  });
  findBranchesByIds.mockResolvedValue([{ id: "b1", isActive: true }]);
  findMembership.mockResolvedValue(membership);
});
describe("staff service", () => {
  it("lists staff with permission and correct repository scope", async () => {
    findMany.mockResolvedValue([{ id: "u2" }]);
    await expect(
      staffService.list({ ...base, permissions: ["staff:read"] }),
    ).resolves.toEqual({
      items: [{ id: "u2" }],
      total: 1,
      page: 1,
      limit: 25,
    });
    expect(findMany).toHaveBeenCalledWith("t1", "b1", undefined, "admin");
  });
  it("falls back to the active auth branch when branchIds are omitted", async () => {
    create.mockResolvedValue({ id: "m1", userId: "u2" });
    await staffService.create(
      { ...base, branchId: "b1", permissions: ["staff:create"] },
      {
        firstName: "A",
        lastName: "B",
        email: "b@x.com",
        password: "password1",
        roleId: "r1",
      },
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ branchIds: ["b1"] }),
    );
  });

  it("creates branch staff, hashes the password, and audits creation", async () => {
    create.mockResolvedValue({ id: "m1", userId: "u2" });
    await expect(
      staffService.create(
        { ...base, permissions: ["staff:create"] },
        {
          firstName: "A",
          lastName: "B",
          email: "b@x.com",
          password: "password1",
          roleId: "r1",
          branchIds: ["b1"],
        },
      ),
    ).resolves.toEqual(membership);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        passwordHash: "HASH",
        roleId: "r1",
        branchIds: ["b1"],
      }),
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STAFF_CREATED" }),
    );
  });
  it("rejects tenant-wide roles for non-owner branch-scoped managers and invalid branches", async () => {
    findRoleById.mockResolvedValue({
      id: "r2",
      name: "MANAGER",
      scope: "TENANT",
    });
    await expect(
      staffService.create(
        {
          ...base,
          roles: ["MANAGER"],
          tenantWide: false,
          authorizedBranchIds: ["b1"],
          permissions: ["staff:create"],
        },
        {
          firstName: "A",
          lastName: "B",
          email: "b@x.com",
          password: "password1",
          roleId: "r2",
          branchIds: [],
        },
      ),
    ).rejects.toThrow(
      "Branch-scoped memberships cannot assign tenant-wide roles",
    );
    findRoleById.mockResolvedValue({
      id: "r1",
      name: "CASHIER",
      scope: "BRANCH",
    });
    findBranchesByIds.mockResolvedValue([]);
    await expect(
      staffService.create(
        { ...base, permissions: ["staff:create"] },
        {
          firstName: "A",
          lastName: "B",
          email: "b@x.com",
          password: "password1",
          roleId: "r1",
          branchIds: ["outside"],
        },
      ),
    ).rejects.toThrow("outside the active tenant");
  });
  it("requires a branch for branch-scoped staff and rejects tenant-wide roles with assignments", async () => {
    findBranchesByIds.mockResolvedValueOnce([]);
    await expect(
      staffService.create(
        { ...base, permissions: ["staff:create"], branchId: null },
        {
          firstName: "A",
          lastName: "B",
          email: "b@x.com",
          password: "password1",
          roleId: "r1",
        },
      ),
    ).rejects.toThrow("specific branch");
    findRoleById.mockResolvedValue({
      id: "r2",
      name: "MANAGER",
      scope: "TENANT",
    });
    await expect(
      staffService.create(
        { ...base, permissions: ["staff:create"] },
        {
          firstName: "A",
          lastName: "B",
          email: "b@x.com",
          password: "password1",
          roleId: "r2",
          branchIds: ["b1"],
        },
      ),
    ).rejects.toThrow("Tenant-wide staff cannot have branch assignments");
  });
  it("updates profile/status/role/branches and audits the requested changes", async () => {
    await expect(
      staffService.update(
        {
          ...base,
          permissions: [
            "staff:update",
            "staff:deactivate",
            "staff:assign_role",
            "staff:assign_branch",
          ],
        },
        "u2",
        {
          firstName: "New",
          status: "INACTIVE",
          roleId: "r1",
          branchIds: ["b1"],
        },
      ),
    ).resolves.toEqual(membership);
    expect(updateGlobalUserProfile).toHaveBeenCalledWith("u2", {
      firstName: "New",
    });
    expect(updateMembershipStatus).toHaveBeenCalledWith("t1", "u2", "INACTIVE");
    expect(setRole).toHaveBeenCalledWith("m1", "r1");
    expect(setBranches).toHaveBeenCalledWith("m1", ["b1"]);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STAFF_DEACTIVATED" }),
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STAFF_ROLE_ASSIGNED" }),
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STAFF_BRANCHES_ASSIGNED" }),
    );
  });
  it("prevents managing a target outside branch scope and handles removal", async () => {
    findMembership.mockResolvedValue({
      ...membership,
      branches: [{ branchId: "other" }],
    });
    await expect(
      staffService.update(
        {
          ...base,
          tenantWide: false,
          authorizedBranchIds: ["b1"],
          permissions: ["staff:update"],
        },
        "u2",
        { firstName: "Nope" },
      ),
    ).rejects.toThrow("not found");
    findMembership.mockResolvedValue(membership);
    softDelete.mockResolvedValue(undefined);
    await expect(
      staffService.remove({ ...base, permissions: ["staff:deactivate"] }, "u2"),
    ).rejects.toThrow("not found");
  });
  it("filters role listing for non-owner branch-scoped users", async () => {
    findAllRoles.mockResolvedValue([
      { name: "OWNER", scope: "GLOBAL" },
      { name: "MANAGER", scope: "TENANT" },
      { name: "CASHIER", scope: "BRANCH" },
    ]);
    await expect(
      staffService.listRoles({
        ...base,
        roles: ["MANAGER"],
        tenantWide: false,
        permissions: ["staff:read"],
      }),
    ).resolves.toEqual([{ name: "CASHIER", scope: "BRANCH" }]);
  });
});
