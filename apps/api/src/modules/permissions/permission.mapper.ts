import type {
  PermissionResponseItem,
  RoleWithPermissionsResponse,
} from "@pos/contracts";
import { toRoleResponse } from "@/modules/roles/role.mapper";

export const toPermissionResponse = (permission: {
  id: string;
  key: string;
  module: string;
  description: string | null;
}): PermissionResponseItem => ({
  id: permission.id,
  key: permission.key,
  module: permission.module,
  description: permission.description,
});

export const toRoleWithPermissionsResponse = (role: {
  id: string;
  tenantId: string | null;
  name: string;
  scope: "GLOBAL" | "TENANT" | "BRANCH";
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  rolePermissions: Array<{
    permission: Parameters<typeof toPermissionResponse>[0] | null;
  }>;
}): RoleWithPermissionsResponse => ({
  ...toRoleResponse(role),
  permissions: role.rolePermissions
    .map((item) => item.permission)
    .filter((permission): permission is NonNullable<typeof permission> =>
      Boolean(permission),
    )
    .map(toPermissionResponse),
});
