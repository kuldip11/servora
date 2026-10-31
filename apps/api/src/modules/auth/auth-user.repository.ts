import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tenantMemberships, users } from "@/db/schema";
import { normalizeAuthEmail } from "./auth-email";

export const authUserRepository = {
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  }) {
    const [user] = await db
      .insert(users)
      .values({ ...data, email: normalizeAuthEmail(data.email) })
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
        eq(users.email, normalizeAuthEmail(email)),
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
        eq(users.email, normalizeAuthEmail(email)),
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
        eq(users.email, normalizeAuthEmail(email)),
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
};
