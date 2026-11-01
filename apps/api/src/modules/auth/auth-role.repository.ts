import type { RoleName } from "@pos/types";
import { and, eq, isNull } from "drizzle-orm";
import { InternalError, ServiceUnavailableError } from "@/core/errors";
import { db } from "@/db";
import {
  globalUserRoles,
  permissions,
  rolePermissions,
  roles,
  users,
} from "@/db/schema";
import { normalizeAuthEmail } from "./auth-email";

export const authRoleRepository = {
  async createUserWithGlobalOwnerRole(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  }) {
    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ ...data, email: normalizeAuthEmail(data.email) })
        .returning();
      if (!user) throw new InternalError("User creation failed");

      let role = await tx.query.roles.findFirst({
        where: and(
          eq(roles.name, "OWNER"),
          eq(roles.scope, "GLOBAL"),
          isNull(roles.tenantId),
        ),
      });
      if (!role) {
        const [createdRole] = await tx
          .insert(roles)
          .values({
            name: "OWNER",
            scope: "GLOBAL",
            description: "Global owner access",
            isSystem: true,
          })
          .returning();
        role = createdRole;
      }
      if (!role)
        throw new InternalError("Unable to provision GLOBAL OWNER role");

      const allPermissions = await tx
        .select({ id: permissions.id })
        .from(permissions);
      if (!allPermissions.length) {
        throw new ServiceUnavailableError(
          "RBAC reference data is not available. Run the database migrations before using authentication.",
        );
      }

      await tx
        .insert(rolePermissions)
        .values(
          allPermissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        )
        .onConflictDoNothing();

      await tx
        .insert(globalUserRoles)
        .values({ userId: user.id, roleId: role.id })
        .onConflictDoNothing();

      return { user, role };
    });
  },

  async ensureGlobalOwnerRole() {
    return db.transaction(async (tx) => {
      let role = await tx.query.roles.findFirst({
        where: and(
          eq(roles.name, "OWNER"),
          eq(roles.scope, "GLOBAL"),
          isNull(roles.tenantId),
        ),
      });
      if (!role) {
        const [createdRole] = await tx
          .insert(roles)
          .values({
            name: "OWNER",
            scope: "GLOBAL",
            description: "Global owner access",
            isSystem: true,
          })
          .returning();
        role = createdRole;
      }
      if (!role)
        throw new InternalError("Unable to provision GLOBAL OWNER role");

      const allPermissions = await tx
        .select({ id: permissions.id })
        .from(permissions);
      if (!allPermissions.length) {
        throw new ServiceUnavailableError(
          "RBAC reference data is not available. Run the database migrations before using authentication.",
        );
      }
      await tx
        .insert(rolePermissions)
        .values(
          allPermissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        )
        .onConflictDoNothing();
      return role;
    });
  },

  async findRoleByName(name: RoleName) {
    return db.query.roles.findFirst({
      where: and(
        eq(roles.name, name),
        isNull(roles.tenantId),
        eq(roles.isSystem, true),
      ),
    });
  },

  async assignRole(userId: string, roleId: string) {
    await db
      .insert(globalUserRoles)
      .values({ userId, roleId })
      .onConflictDoNothing();
  },
};
