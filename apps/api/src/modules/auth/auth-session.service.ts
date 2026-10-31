import crypto from "crypto";
import { ForbiddenError, InternalError } from "@/core/errors";
import { signAccessToken } from "@/lib/jwt";
import { assertUserAppAccess } from "./auth-access.service";
import type { AuthApp } from "./auth-app";
import { invalidRefreshToken } from "./auth.errors";
import { authRepository } from "./auth.repository";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueAuthTokens(
  user: Awaited<ReturnType<typeof authRepository.findUserById>>,
  app: AuthApp = "web",
  existingSessionId?: string,
) {
  if (!user) throw new InternalError("User not found");

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
}

export const authSessionService = {
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
    return issueAuthTokens(user, app, stored.sessionId);
  },
  async sessions(userId: string) {
    return authRepository.listActiveSessions(userId);
  },
  async revokeSession(userId: string, sessionId: string) {
    const session = await authRepository.revokeSession(userId, sessionId);
    if (!session) throw new ForbiddenError("Session not found");
    return { revoked: true };
  },
  _issueTokens: issueAuthTokens,
};
