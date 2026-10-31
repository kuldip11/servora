import bcrypt from "bcryptjs";
import type { LoginRequest, SignupRequest } from "@pos/contracts";
import { ConflictError, InternalError } from "@/core/errors";
import { assertUserAppAccess } from "./auth-access.service";
import type { AuthApp } from "./auth-app";
import { accountTemporarilyLocked, invalidCredentials } from "./auth.errors";
import { authRepository } from "./auth.repository";
import { issueAuthTokens } from "./auth-session.service";

export const authAuthenticationService = {
  async signup(input: SignupRequest) {
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
    if (!fullUser) throw new InternalError("User creation failed");

    return {
      user: {
        id: fullUser.id,
        tenantId: null,
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
  async login(input: LoginRequest, app: AuthApp = "web") {
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
    return issueAuthTokens(user, app);
  },
};
