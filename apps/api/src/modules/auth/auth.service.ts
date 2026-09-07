import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authRepository } from "./auth.repository";
import { listUserMemberships } from "@/core/auth/membership-context";
import {
  resolveAuthorization,
  resolveMembership,
} from "@/core/auth/authorization";
import { db } from "@/db";
import { ConflictError, ForbiddenError, ValidationError } from "@/core/errors";
import { signAccessToken } from "@/lib/jwt";
import {
  hasAppRoleAccess,
  hasMembershipAppAccess,
  type AuthApp,
} from "./auth-app";
import type { SignupInput, LoginInput } from "@pos/validation";
import {
  invalidCredentials,
  userInactive,
  invalidRefreshToken,
  authUserNotFound,
  accountTemporarilyLocked,
} from "./auth.errors";

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const membershipHasAppAccess = async (
  userId: string,
  tenantId: string,
  app: AuthApp,
): Promise<boolean> => {
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
};

const assertUserAppAccess = async (
  user: NonNullable<Awaited<ReturnType<typeof authRepository.findUserById>>>,
  app: AuthApp,
): Promise<void> => {
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
};

export const authService = {
  async signup(input: SignupInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing =
      await authRepository.findStandaloneUserByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError("Account already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const { user } = await authRepository.createUserWithGlobalOwnerRole({
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      passwordHash,
    });

    const fullUser = await authRepository.findUserById(user.id);
    if (!fullUser) throw new Error("User creation failed");

    return {
      user: {
        id: fullUser.id,
        tenantId: "",
        branchId: null,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        displayName: fullUser.displayName,
        email: fullUser.email,
        phone: fullUser.phone,
        profileImageUrl: fullUser.profileImageUrl,
        status: fullUser.status,
        roles: fullUser.globalUserRoles.map((ur) => ({
          id: ur.roleId,
          name: ur.role.name,
          description: ur.role.description ?? "",
          permissions: ur.role.rolePermissions.map((rp) => rp.permission),
        })),
      },
    };
  },

  async login(input: LoginInput, app: AuthApp = "web") {
    const users = await authRepository.findUsersByEmail(input.email);
    if (users.length !== 1) throw invalidCredentials();

    const user = users[0]!;
    if (user.status !== "ACTIVE") throw invalidCredentials();
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw accountTemporarilyLocked();
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;
      const lockMinutes = 15;
      const lockedUntil =
        nextAttempts >= maxAttempts
          ? new Date(Date.now() + lockMinutes * 60 * 1000)
          : null;
      await authRepository.recordFailedLogin(
        user.id,
        nextAttempts,
        lockedUntil,
      );
      if (lockedUntil) throw accountTemporarilyLocked();
      throw invalidCredentials();
    }

    await assertUserAppAccess(user, app);
    await authRepository.resetLoginFailures(user.id);
    return authService._issueTokens(user, app);
  },

  async logout(tokenValue: string) {
    const tokenHash = hashToken(tokenValue);
    const token = await authRepository.revokeRefreshToken(tokenHash);
    if (token?.sessionId)
      await authRepository.revokeSession(token.userId, token.sessionId);
    return { loggedOut: true };
  },

  async refresh(tokenValue: string, app: AuthApp = "web") {
    if (!tokenValue.startsWith(`${app}.`)) throw invalidRefreshToken();
    const tokenHash = hashToken(tokenValue);

    const stored = await authRepository.consumeRefreshToken(tokenHash);
    if (!stored) throw invalidRefreshToken();

    const user = await authRepository.findUserById(stored.userId);
    if (!user || !stored.sessionId) throw invalidRefreshToken();
    const session = await authRepository.findSession(
      stored.userId,
      stored.sessionId,
    );
    if (!session || session.revokedAt || session.expiresAt <= new Date())
      throw invalidRefreshToken();

    await assertUserAppAccess(user, app);
    return authService._issueTokens(user, app, stored.sessionId);
  },

  async sessions(userId: string) {
    return authRepository.listActiveSessions(userId);
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await authRepository.revokeSession(userId, sessionId);
    if (!session) throw new ForbiddenError("Session not found");
    return { revoked: true };
  },

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

  async _issueTokens(
    user: Awaited<ReturnType<typeof authRepository.findUserById>>,
    app: AuthApp = "web",
    existingSessionId?: string,
  ) {
    if (!user) throw new Error("User not found");

    const globalRoles = user.globalUserRoles.map((ur) => ({
      id: ur.roleId,
      name: ur.role.name,
      description: ur.role.description ?? "",
      permissions: ur.role.rolePermissions.map((rp) => rp.permission),
    }));

    const accessToken = signAccessToken(
      {
        id: user.id,
        email: user.email,
        roles: globalRoles,
      },
      app,
    );

    const refreshTokenValue = `${app}.${crypto.randomBytes(64).toString("hex")}`;
    const tokenHash = hashToken(refreshTokenValue);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let sessionId = existingSessionId;
    if (!sessionId) {
      const session = await authRepository.createSession({
        userId: user.id,
        expiresAt,
      });
      sessionId = session.id;
    } else {
      await authRepository.touchSession(sessionId, expiresAt);
    }
    await authRepository.saveRefreshToken({
      userId: user.id,
      sessionId,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 900,
      sessionId,
      user: {
        id: user.id,
        tenantId: null,
        branchId: null,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        status: user.status,
        roles: globalRoles,
      },
    };
  },
};
