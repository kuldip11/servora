import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  ValidationError,
} from "@/core/errors";
import { writeAudit } from "@/core/audit";
import { roleRepository } from "./role.repository";
import { isReservedSystemRoleName } from "@/modules/permissions/constants/system-role-permissions";

const normalizeName = (name: string) => {
  return name.trim().replace(/\s+/g, " ");
};

const requireRoleAdministration = (auth: AuthContext, permission: string) => {
  requirePermission(auth, permission);
  if (!auth.tenantWide) {
    throw new ForbiddenError("Tenant-wide access is required to manage roles");
  }
};

export const roleService = {
  async list(auth: AuthContext) {
    requirePermission(auth, "staff:read");
    return roleRepository.listForTenant(auth.tenantId);
  },

  async create(
    auth: AuthContext,
    input: { name: string; description?: string; scope: "TENANT" | "BRANCH" },
  ) {
    requireRoleAdministration(auth, "roles:create");
    const name = normalizeName(input.name);
    if (!name) throw new ValidationError("Role name is required");
    if (isReservedSystemRoleName(name)) {
      throw new ConflictError("System role names are reserved");
    }
    if (
      await roleRepository.findByNameAndScope(auth.tenantId, name, input.scope)
    ) {
      throw new ConflictError("A role with this name and scope already exists");
    }
    const role = await roleRepository.create(auth.tenantId, { ...input, name });
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ROLE_CREATED",
      entity: "role",
      entityId: role.id,
      metadata: { name: role.name, scope: role.scope },
    });
    return role;
  },

  async update(
    auth: AuthContext,
    id: string,
    input: { name?: string; description?: string },
  ) {
    requireRoleAdministration(auth, "roles:update");
    const existing = await roleRepository.findTenantRole(auth.tenantId, id);
    if (!existing || !existing.isActive)
      throw new NotFoundError("Role not found");
    if (existing.isSystem)
      throw new ForbiddenError("System roles cannot be modified");
    if (input.name !== undefined) {
      const name = normalizeName(input.name);
      if (isReservedSystemRoleName(name)) {
        throw new ConflictError("System role names are reserved");
      }
      const duplicate = await roleRepository.findByNameAndScope(
        auth.tenantId,
        name,
        existing.scope as "TENANT" | "BRANCH",
      );
      if (duplicate && duplicate.id !== id)
        throw new ConflictError(
          "A role with this name and scope already exists",
        );
      input = { ...input, name };
    }
    const updated = await roleRepository.update(id, input);
    if (!updated)
      throw new InternalError("Role update did not return a record");
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ROLE_UPDATED",
      entity: "role",
      entityId: id,
      metadata: input,
    });
    return updated;
  },

  async archive(auth: AuthContext, id: string) {
    requireRoleAdministration(auth, "roles:archive");
    const existing = await roleRepository.findTenantRole(auth.tenantId, id);
    if (!existing || !existing.isActive)
      throw new NotFoundError("Role not found");
    if (existing.isSystem)
      throw new ForbiddenError("System roles cannot be archived");
    if ((await roleRepository.assignmentCount(id)) > 0) {
      throw new ConflictError(
        "Role is assigned to staff and cannot be archived",
      );
    }
    await roleRepository.archive(id);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ROLE_ARCHIVED",
      entity: "role",
      entityId: id,
    });
  },
};
