import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { refreshTokens, userSessions } from "@/db/schema";

export const authSessionRepository = {
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
