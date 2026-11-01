import { Elysia } from "elysia";
import {
  auditListQuerySchema,
  auditLogListResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { requireAuthPlugin, requirePermission } from "@/core/auth";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { successResponse } from "@/core/response";
import { toAuditLogResponse } from "./audit.mapper";

export const auditRouter = new Elysia({ prefix: "/api/audit" })
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth, query }) => {
      requirePermission(auth, "audit:read");
      if (!auth.tenantId) return successResponse([]);
      const before = query.before ? new Date(query.before) : undefined;
      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          branchId: auditLogs.branchId,
          requestId: auditLogs.requestId,
          metadata: auditLogs.metadata,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          userId: auditLogs.userId,
          userName: sql<
            string | null
          >`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.userId))
        .where(
          and(
            eq(auditLogs.tenantId, auth.tenantId),
            auth.branchId ? eq(auditLogs.branchId, auth.branchId) : undefined,
            query.action ? eq(auditLogs.action, query.action) : undefined,
            query.entity ? eq(auditLogs.entity, query.entity) : undefined,
            query.userId ? eq(auditLogs.userId, query.userId) : undefined,
            before && !Number.isNaN(before.getTime())
              ? lt(auditLogs.createdAt, before)
              : undefined,
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(Math.min(query.limit ?? 50, 100));

      return successResponse(rows.map(toAuditLogResponse));
    },
    {
      query: auditListQuerySchema,
      response: {
        200: auditLogListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
