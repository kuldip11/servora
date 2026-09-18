import type { RoleName } from "@pos/types";

import { eq, and, isNull, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { ServiceUnavailableError, InternalError } from "@/core/errors";
import {
  users,
  roles,
  globalUserRoles,
  refreshTokens,
  permissions,
  rolePermissions,
  tenantMemberships,
  userSessions,
} from "@/db/schema";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const authRepository = {
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  }) {
    const [user] = await db
      .insert(users)
      .values({ ...data, email: normalizeEmail(data.email) })
      .returning();
    return user!;
  },

  async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      displayName?: string | null;
      phone?: string | null;
      profileImageUrl?: string | null;
    },
  ) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning();
    return updated;
  },
  async updatePasswordHash(userId: string, passwordHash: string) {
    const [updated] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({ id: users.id });
    return updated;
  },
  async findStandaloneUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: and(
        eq(users.email, normalizeEmail(email)),
        isNull(users.deletedAt),
      ),
      with: {
        globalUserRoles: {
          with: {
            role: {
              with: { rolePermissions: { with: { permission: true } } },
            },
          },
        },
      },
    });
  },

  async recordFailedLogin(
    userId: string,
    attempts: number,
    lockedUntil: Date | null,
  ) {
    const [updated] = await db
      .update(users)
      .set({
        failedLoginAttempts: attempts,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      });
    return updated;
  },

  async resetLoginFailures(userId: string) {
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  },

  async findUsersByEmail(email: string) {
    return db.query.users.findMany({
      where: and(
        eq(users.email, normalizeEmail(email)),
        isNull(users.deletedAt),
      ),
      with: {
        globalUserRoles: {
          with: {
            role: {
              with: {
                rolePermissions: { with: { permission: true } },
              },
            },
          },
        },
      },
    });
  },

  async findUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: and(
        eq(users.email, normalizeEmail(email)),
        isNull(users.deletedAt),
      ),
      with: {
        globalUserRoles: {
          with: {
            role: {
              with: {
                rolePermissions: { with: { permission: true } },
              },
            },
          },
        },
      },
    });
  },

  async findMembershipById(membershipId: string) {
    return db.query.tenantMemberships.findFirst({
      where: eq(tenantMemberships.id, membershipId),
      with: {
        roles: {
          with: {
            role: { with: { rolePermissions: { with: { permission: true } } } },
          },
        },
        branches: true,
      },
    });
  },

  async findMembershipByUserAndTenant(userId: string, tenantId: string) {
    return db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.userId, userId),
        eq(tenantMemberships.tenantId, tenantId),
      ),
      with: {
        roles: {
          with: {
            role: {
              with: {
                rolePermissions: { with: { permission: true } },
              },
            },
          },
        },
        branches: true,
      },
    });
  },

  async findUserById(id: string) {
    return db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
      with: {
        globalUserRoles: {
          with: {
            role: {
              with: {
                rolePermissions: { with: { permission: true } },
              },
            },
          },
        },
      },
    });
  },

  async createUserWithGlobalOwnerRole(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  }) {
    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ ...data, email: normalizeEmail(data.email) })
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

  async saveRefreshToken(data: {
    userId: string;
    membershipId?: string;
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const [token] = await db.insert(refreshTokens).values(data).returning();
    return token!;
  },

  async revokeRefreshToken(tokenHash: string) {
    const [token] = await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .returning({
        id: refreshTokens.id,
        sessionId: refreshTokens.sessionId,
        userId: refreshTokens.userId,
      });
    return token;
  },

  async consumeRefreshToken(tokenHash: string) {
    const [token] = await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    return token;
  },
  async createSession(data: {
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const [session] = await db.insert(userSessions).values(data).returning();
    return session!;
  },

  async findSession(userId: string, sessionId: string) {
    return db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, userId),
      ),
    });
  },

  async listActiveSessions(userId: string) {
    return db.query.userSessions.findMany({
      where: and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date()),
      ),
      orderBy: (s, { desc }) => [desc(s.lastSeenAt)],
    });
  },

  async touchSession(sessionId: string, expiresAt: Date) {
    await db
      .update(userSessions)
      .set({ lastSeenAt: new Date(), expiresAt })
      .where(
        and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)),
      );
  },

  async revokeSession(userId: string, sessionId: string) {
    const [session] = await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.id, sessionId),
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt),
        ),
      )
      .returning();
    if (session)
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.sessionId, sessionId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    return session;
  },
};
