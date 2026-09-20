import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import {
  ForbiddenError,
  InternalError,
  NotFoundError,
  ValidationError,
} from "@/core/errors";
import { writeAudit } from "@/core/audit";
import { permissionRepository } from "./permission.repository";

const requireTenantWide = (auth: AuthContext) => {
  if (!auth.tenantWide)
    throw new ForbiddenError(
      "Tenant-wide access is required to manage role permissions",
    );
};

export const permissionService = {
  async list(auth: AuthContext) {
    requirePermission(auth, "permissions:read");
    return permissionRepository.list();
  },
  async forRole(auth: AuthContext, roleId: string) {
    requirePermission(auth, "roles:read");
    const role = await permissionRepository.findRole(auth.tenantId, roleId);
    if (!role) throw new NotFoundError("Role not found");
    return role.rolePermissions.map((item) => item.permission).filter(Boolean);
  },
  async setForRole(auth: AuthContext, roleId: string, permissionIds: string[]) {
    requirePermission(auth, "roles:assign_permissions");
    requireTenantWide(auth);
    const role = await permissionRepository.findRole(auth.tenantId, roleId);
    if (!role) throw new NotFoundError("Role not found");
    if (role.isSystem)
      throw new ForbiddenError(
        "System role permissions are managed by Servora reference data",
      );
    const uniqueIds = [...new Set(permissionIds)];
    const found = await permissionRepository.findPermissionsByIds(uniqueIds);
    if (found.length !== uniqueIds.length)
      throw new ValidationError("One or more permissions are invalid");
    await permissionRepository.replaceRolePermissions(roleId, uniqueIds);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ROLE_PERMISSIONS_UPDATED",
      entity: "role",
      entityId: roleId,
      metadata: { permissionIds: uniqueIds },
    });
    const updatedRole = await permissionRepository.findRole(
      auth.tenantId,
      roleId,
    );
    if (!updatedRole)
      throw new InternalError("Updated role permissions could not be loaded");
    return updatedRole;
  },
};
