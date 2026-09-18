import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { ConflictError, InternalError } from "@/core/errors";
import {
  branches,
  membershipBranches,
  membershipRoles,
  roles,
  tenantMemberships,
  users,
} from "@/db/schema";

import { STAFF_LIST_COLUMNS } from "./constants";

export const staffRepository = {
  async findMany(
    tenantId: string,
    branchId: string | null,
    authorizedBranchIds?: string[],
    excludeUserId?: string,
  ) {
    const memberships = await db.query.tenantMemberships.findMany({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.status, "ACTIVE"),
      ),
      with: {
        user: { columns: STAFF_LIST_COLUMNS },
        roles: { with: { role: true } },
        branches: { with: { branch: true } },
      },
    });

    const appliesToBranch = (
      membership: (typeof memberships)[number],
      id: string,
    ) =>
      membership.branches.some((item) => item.branchId === id) ||
      membership.roles.some((item) => item.role.scope === "TENANT");
    const scoped = branchId
      ? memberships.filter((membership) =>
          appliesToBranch(membership, branchId),
        )
      : authorizedBranchIds
        ? memberships.filter(
            (membership) =>
              membership.roles.some((item) => item.role.scope === "TENANT") ||
              membership.branches.some((item) =>
                authorizedBranchIds.includes(item.branchId),
              ),
          )
        : memberships;

    return scoped
      .filter(
        (membership) =>
          membership.user &&
          !membership.user.deletedAt &&
          membership.user.id !== excludeUserId,
      )
      .map((membership) => ({
        ...membership.user,
        membershipId: membership.id,
        roles: membership.roles.map((item) => item.role),
        assignedBranches: membership.branches
          .map((item) => item.branch)
          .filter(Boolean),
      }));
  },

  async findMembership(tenantId: string, userId: string) {
    return db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, userId),
      ),
      with: {
        user: { columns: STAFF_LIST_COLUMNS },
        roles: { with: { role: true } },
        branches: { with: { branch: true } },
      },
    });
  },

  async findRoleById(roleId: string, tenantId?: string) {
    return db.query.roles.findFirst({
      where: and(
        eq(roles.id, roleId),
        eq(roles.isActive, true),
        tenantId
          ? or(isNull(roles.tenantId), eq(roles.tenantId, tenantId))
          : undefined,
      ),
    });
  },

  async findBranchesByIds(tenantId: string, branchIds: string[]) {
    if (branchIds.length === 0) return [];
    return db.query.branches.findMany({
      where: and(
        eq(branches.tenantId, tenantId),
        inArray(branches.id, branchIds),
      ),
      columns: { id: true, isActive: true },
    });
  },

  async create(data: {
    tenantId: string;
    branchId?: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    roleId: string;
    branchIds: string[];
  }) {
    return db.transaction(async (tx) => {
      let user = await tx.query.users.findFirst({
        where: and(eq(users.email, data.email), isNull(users.deletedAt)),
      });

      if (!user) {
        const [created] = await tx
          .insert(users)
          .values({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            passwordHash: data.passwordHash,
          })
          .returning();
        user = created;
      }
      if (!user) throw new InternalError("Staff creation failed");

      const existingMembership = await tx.query.tenantMemberships.findFirst({
        where: and(
          eq(tenantMemberships.userId, user.id),
          eq(tenantMemberships.tenantId, data.tenantId),
        ),
      });
      if (existingMembership)
        throw new ConflictError("User already belongs to this tenant");

      const [membership] = await tx
        .insert(tenantMemberships)
        .values({
          userId: user.id,
          tenantId: data.tenantId,
        })
        .returning();
      if (!membership)
        throw new InternalError("Staff membership creation failed");

      await tx
        .insert(membershipRoles)
        .values({ membershipId: membership.id, roleId: data.roleId });
      if (data.branchIds.length) {
        await tx.insert(membershipBranches).values(
          data.branchIds.map((branchId) => ({
            membershipId: membership.id,
            tenantId: data.tenantId,
            branchId,
          })),
        );
      }

      return membership;
    });
  },

  async updateUser(
    tenantId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
    },
  ) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning();
    return updated;
  },

  async updateMembershipStatus(
    tenantId: string,
    userId: string,
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
  ) {
    const [updated] = await db
      .update(tenantMemberships)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      )
      .returning();
    return updated;
  },

  async setRole(membershipId: string, roleId: string) {
    return db.transaction(async (tx) => {
      await tx
        .delete(membershipRoles)
        .where(eq(membershipRoles.membershipId, membershipId));
      await tx.insert(membershipRoles).values({ membershipId, roleId });
    });
  },

  async setBranches(membershipId: string, branchIds: string[]) {
    return db.transaction(async (tx) => {
      const membership = await tx.query.tenantMemberships.findFirst({
        where: eq(tenantMemberships.id, membershipId),
        columns: { tenantId: true },
      });
      if (!membership) throw new InternalError("Membership not found");
      await tx
        .delete(membershipBranches)
        .where(eq(membershipBranches.membershipId, membershipId));
      if (branchIds.length) {
        await tx.insert(membershipBranches).values(
          branchIds.map((branchId) => ({
            membershipId,
            tenantId: membership.tenantId,
            branchId,
          })),
        );
      }
    });
  },

  async softDelete(tenantId: string, id: string) {
    return this.updateMembershipStatus(tenantId, id, "INACTIVE");
  },

  async findAllRoles(tenantId: string) {
    return db.query.roles.findMany({
      where: and(
        eq(roles.isActive, true),
        or(isNull(roles.tenantId), eq(roles.tenantId, tenantId)),
      ),
    });
  },
};
