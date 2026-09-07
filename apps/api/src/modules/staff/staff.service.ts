import bcrypt from "bcryptjs";
import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { staffRepository } from "./staff.repository";
import { staffNotFound, branchRequiredForStaff } from "./staff.errors";
import { ForbiddenError, ValidationError } from "@/core/errors";
import { writeAudit } from "@/core/audit";

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
  branchIds?: string[] | undefined;
}

export interface UpdateStaffInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
  roleId?: string | undefined;
  branchIds?: string[] | undefined;
}

type StaffMembership = NonNullable<
  Awaited<ReturnType<typeof staffRepository.findMembership>>
>;

const canManageTarget = (auth: AuthContext, membership: StaffMembership) => {
  if (auth.tenantWide) return;
  const targetBranches = membership.branches.map((item) => item.branchId);
  if (
    !targetBranches.some((id: string) =>
      (auth.authorizedBranchIds ?? []).includes(id),
    )
  ) {
    throw staffNotFound(membership.userId);
  }
};

const validateRole = async (auth: AuthContext, roleId: string) => {
  const role = await staffRepository.findRoleById(roleId, auth.tenantId);
  if (!role) throw new ValidationError("Invalid role");
  if (role.scope === "GLOBAL") {
    throw new ForbiddenError(
      "Global roles cannot be assigned from a franchise",
    );
  }
  if (role.scope === "TENANT" && !auth.tenantWide) {
    throw new ForbiddenError(
      "Branch-scoped memberships cannot assign tenant-wide roles",
    );
  }
  return role;
};

const validateBranches = async (auth: AuthContext, branchIds: string[]) => {
  const unique = [...new Set(branchIds)];
  const branches = await staffRepository.findBranchesByIds(
    auth.tenantId,
    unique,
  );
  if (branches.length !== unique.length)
    throw new ForbiddenError(
      "One or more branches are outside the active tenant",
    );
  if (
    !auth.tenantWide &&
    unique.some((id) => !(auth.authorizedBranchIds ?? []).includes(id))
  ) {
    throw new ForbiddenError(
      "Branch assignment is outside your membership scope",
    );
  }
  return unique;
};

export const staffService = {
  async list(
    auth: AuthContext,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
  ) {
    requirePermission(auth, "staff:read");
    const rows = await staffRepository.findMany(
      auth.tenantId,
      auth.branchId,
      auth.tenantWide ? undefined : auth.authorizedBranchIds,
      auth.userId,
    );
    const search = filters.search?.trim().toLowerCase();
    const filtered = rows.filter((member) => {
      const matchesSearch =
        !search ||
        `${member.firstName ?? ""} ${member.lastName ?? ""} ${member.email ?? ""}`
          .toLowerCase()
          .includes(search);
      return (
        matchesSearch && (!filters.status || member.status === filters.status)
      );
    });
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
    };
  },

  async create(auth: AuthContext, input: CreateStaffInput) {
    requirePermission(auth, "staff:create");
    const role = await validateRole(auth, input.roleId);
    const branchIds = await validateBranches(
      auth,
      input.branchIds ?? (auth.branchId ? [auth.branchId] : []),
    );
    if (role.scope === "BRANCH" && branchIds.length === 0)
      throw branchRequiredForStaff();
    if (
      (role.scope === "GLOBAL" || role.scope === "TENANT") &&
      branchIds.length > 0
    ) {
      throw new ValidationError(
        "Tenant-wide staff cannot have branch assignments",
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const membership = await staffRepository.create({
      tenantId: auth.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
      roleId: role.id,
      branchIds,
    });
    const created = await staffRepository.findMembership(
      auth.tenantId,
      membership.userId,
    );
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "STAFF_CREATED",
      entity: "tenant_membership",
      entityId: membership.id,
      metadata: { targetUserId: membership.userId, roleId: role.id, branchIds },
    });
    return created;
  },

  async update(auth: AuthContext, id: string, input: UpdateStaffInput) {
    const membership = await staffRepository.findMembership(auth.tenantId, id);
    if (!membership) throw staffNotFound(id);
    canManageTarget(auth, membership);

    const profile: {
      firstName?: string;
      lastName?: string;
      status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    } = {};
    if (input.firstName !== undefined) profile.firstName = input.firstName;
    if (input.lastName !== undefined) profile.lastName = input.lastName;
    if (input.status !== undefined) profile.status = input.status;
    if (input.firstName !== undefined || input.lastName !== undefined) {
      requirePermission(auth, "staff:update");
      await staffRepository.updateUser(auth.tenantId, id, profile);
    }

    if (input.status !== undefined) {
      if (input.status === "ACTIVE") requirePermission(auth, "staff:update");
      else requirePermission(auth, "staff:deactivate");
      await staffRepository.updateMembershipStatus(
        auth.tenantId,
        id,
        input.status,
      );
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action:
          input.status === "ACTIVE" ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
        entity: "tenant_membership",
        entityId: membership.id,
        metadata: { targetUserId: membership.userId, status: input.status },
      });
    }

    if (input.roleId !== undefined) {
      requirePermission(auth, "staff:assign_role");
      const role = await validateRole(auth, input.roleId);
      const targetBranches =
        input.branchIds ?? membership.branches.map((item) => item.branchId);
      if (
        (role.scope === "GLOBAL" || role.scope === "TENANT") &&
        targetBranches.length
      )
        throw new ValidationError(
          "Tenant-wide staff cannot have branch assignments",
        );
      await staffRepository.setRole(membership.id, role.id);
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action: "STAFF_ROLE_ASSIGNED",
        entity: "tenant_membership",
        entityId: membership.id,
        metadata: { targetUserId: membership.userId, roleId: role.id },
      });
    }

    if (input.branchIds !== undefined) {
      requirePermission(auth, "staff:assign_branch");
      const branchIds = await validateBranches(auth, input.branchIds);
      const currentRole = input.roleId
        ? await staffRepository.findRoleById(input.roleId, auth.tenantId)
        : membership.roles[0]?.role;
      if (
        (currentRole?.scope === "GLOBAL" || currentRole?.scope === "TENANT") &&
        branchIds.length
      )
        throw new ValidationError(
          "Tenant-wide staff cannot have branch assignments",
        );
      if (currentRole?.scope === "BRANCH" && branchIds.length === 0)
        throw branchRequiredForStaff();
      await staffRepository.setBranches(membership.id, branchIds);
      await writeAudit({
        tenantId: auth.tenantId,
        userId: auth.userId,
        branchId: auth.branchId,
        requestId: auth.requestId,
        ipAddress: auth.ipAddress,
        action: "STAFF_BRANCHES_ASSIGNED",
        entity: "tenant_membership",
        entityId: membership.id,
        metadata: { targetUserId: membership.userId, branchIds },
      });
    }

    return staffRepository.findMembership(auth.tenantId, id);
  },

  async remove(auth: AuthContext, id: string) {
    requirePermission(auth, "staff:deactivate");
    const membership = await staffRepository.findMembership(auth.tenantId, id);
    if (!membership) throw staffNotFound(id);
    canManageTarget(auth, membership);
    const deleted = await staffRepository.softDelete(auth.tenantId, id);
    if (!deleted) throw staffNotFound(id);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "STAFF_DEACTIVATED",
      entity: "tenant_membership",
      entityId: membership.id,
      metadata: { targetUserId: membership.userId },
    });
  },

  async listRoles(auth: AuthContext) {
    requirePermission(auth, "staff:read");
    const roles = await staffRepository.findAllRoles(auth.tenantId);
    return roles.filter(
      (role) =>
        role.scope !== "GLOBAL" && (auth.tenantWide || role.scope === "BRANCH"),
    );
  },
};
