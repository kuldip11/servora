import bcrypt from "bcryptjs";
import { listUserMemberships } from "@/core/auth/membership-context";
import { ForbiddenError, ValidationError } from "@/core/errors";
import { db } from "@/db";
import { membershipHasAppAccess } from "./auth-access.service";
import type { AuthApp } from "./auth-app";
import { authUserNotFound, invalidCredentials } from "./auth.errors";
import { authRepository } from "./auth.repository";

export const authProfileService = {
  async me(userId: string, membershipId?: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw authUserNotFound();
    const membership = membershipId
      ? await authRepository.findMembershipById(membershipId)
      : undefined;
    if (
      membershipId &&
      (!membership ||
        membership.userId !== userId ||
        membership.status !== "ACTIVE")
    ) {
      throw new ForbiddenError("Membership access denied");
    }
    return { user, membership };
  },
  async memberships(userId: string, app: AuthApp = "web") {
    const memberships = await listUserMemberships(db, userId);
    const allowed = await Promise.all(
      memberships.map((membership) =>
        membershipHasAppAccess(userId, membership.tenant.id, app),
      ),
    );
    return memberships.filter((_, index) => allowed[index]);
  },
  async updateProfile(
    userId: string,
    input: {
      firstName?: string;
      lastName?: string;
      displayName?: string | null;
      phone?: string | null;
      profileImageUrl?: string | null;
    },
  ) {
    const changes = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    if (!Object.keys(changes).length)
      return authRepository.findUserById(userId);
    const updated = await authRepository.updateUserProfile(userId, changes);
    if (!updated) throw authUserNotFound();
    return authRepository.findUserById(userId);
  },
  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw authUserNotFound();
    const matches = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!matches) throw invalidCredentials();
    if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
      throw new ValidationError(
        "New password must be different from the current password",
      );
    }
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const updated = await authRepository.updatePasswordHash(
      userId,
      passwordHash,
    );
    if (!updated) throw authUserNotFound();
  },
};
