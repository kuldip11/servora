import type { RoleResponseItem } from "@pos/contracts";

type RoleRow = {
  id: string;
  tenantId: string | null;
  name: string;
  scope: "GLOBAL" | "TENANT" | "BRANCH";
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
};

export const toRoleResponse = (role: RoleRow): RoleResponseItem => ({
  id: role.id,
  tenantId: role.tenantId,
  name: role.name,
  scope: role.scope,
  description: role.description,
  isSystem: role.isSystem,
  isActive: role.isActive,
});
