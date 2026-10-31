import type { AuthApp } from "./auth-app";
import { hasAppRoleAccess, hasMembershipAppAccess } from "./auth-app";
import { listUserMemberships } from "@/core/auth/membership-context";
import {
  resolveAuthorization,
  resolveMembership,
} from "@/core/auth/authorization";
import { ForbiddenError } from "@/core/errors";
import { db } from "@/db";
import { authRepository } from "./auth.repository";

export async function membershipHasAppAccess(
  userId: string,
  tenantId: string,
  app: AuthApp,
): Promise<boolean> {
  const membership = await resolveMembership(db, userId, tenantId);
  if (!membership) return false;
  const decision = await resolveAuthorization(db, { userId, tenantId });
  if (!decision.allowed) return false;
  return hasMembershipAppAccess(
    app,
    membership.roles.map((item) => ({
      name: item.role?.name ?? item.roleId,
      isSystem: item.role?.isSystem ?? false,
    })),
    decision.permissionKeys,
  );
}

export async function assertUserAppAccess(
  user: NonNullable<Awaited<ReturnType<typeof authRepository.findUserById>>>,
  app: AuthApp,
): Promise<void> {
  const globalRoleNames = user.globalUserRoles.map((item) => item.role.name);
  if (hasAppRoleAccess(app, globalRoleNames)) return;

  const memberships = await listUserMemberships(db, user.id);
  const access = await Promise.all(
    memberships.map((membership) =>
      membershipHasAppAccess(user.id, membership.tenant.id, app),
    ),
  );
  if (!access.some(Boolean)) {
    throw new ForbiddenError(
      "Account does not have access to this application",
    );
  }
}
