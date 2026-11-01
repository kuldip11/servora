import { Elysia, t } from "elysia";
import {
  menuChangeEventListResponseSchema,
  standardErrorResponseSchemas,
  type MenuChangeEventResponse,
} from "@pos/contracts";
import { requireAuthPlugin, requirePermission } from "@/core/auth";
import { successResponse } from "@/core/response";
import {
  menuChangeLog,
  type MenuChangeEntityType,
  type MenuChangeType,
} from "./menu-change-log";
import { compact } from "@/lib/object-utils";

export const menuChangeLogRouter = new Elysia({ prefix: "/api/menu/history" })
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth, query }) => {
      requirePermission(auth, "audit:read");
      const before = query.before ? new Date(query.before) : undefined;
      const rows = await menuChangeLog.list(
        auth.tenantId,
        compact({
          entityType: query.entityType as MenuChangeEntityType | undefined,
          entityId: query.entityId,
          changeType: query.changeType as MenuChangeType | undefined,
          before:
            before && !Number.isNaN(before.getTime()) ? before : undefined,
          limit: query.limit,
        }),
      );
      const data: MenuChangeEventResponse[] = rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        changedBy: row.changedBy ?? null,
        entityType: row.entityType,
        entityId: row.entityId,
        changeType: row.changeType,
        diff: row.diff,
        changedAt: row.changedAt.toISOString(),
      }));
      return successResponse(data);
    },
    {
      query: t.Object({
        entityType: t.Optional(
          t.Union([
            t.Literal("MENU_ITEM"),
            t.Literal("VARIANT"),
            t.Literal("MODIFIER_GROUP"),
            t.Literal("MODIFIER_OPTION"),
            t.Literal("CATEGORY"),
            t.Literal("MENU"),
            t.Literal("MENU_MEMBERSHIP"),
            t.Literal("PRICE_RULE"),
            t.Literal("PROMOTION"),
            t.Literal("RECIPE"),
            t.Literal("SUB_RECIPE"),
            t.Literal("TEMPLATE"),
            t.Literal("AVAILABILITY"),
            t.Literal("TAG"),
          ]),
        ),
        entityId: t.Optional(t.String({ format: "uuid" })),
        changeType: t.Optional(
          t.Union([
            t.Literal("CREATED"),
            t.Literal("UPDATED"),
            t.Literal("PUBLISHED"),
            t.Literal("ARCHIVED"),
            t.Literal("DELETED"),
          ]),
        ),
        before: t.Optional(t.String({ format: "date-time" })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
      }),
      response: {
        200: menuChangeEventListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
