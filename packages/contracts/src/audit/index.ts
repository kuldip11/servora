import { Type, type Static } from "@sinclair/typebox";
import {
  paginationLimitSchema,
  successResponseSchema,
  uuidSchema,
} from "../common";

export const auditListQuerySchema = Type.Object(
  {
    action: Type.Optional(Type.String({ maxLength: 100 })),
    entity: Type.Optional(Type.String({ maxLength: 100 })),
    userId: Type.Optional(uuidSchema),
    before: Type.Optional(Type.String({ format: "date-time" })),
    limit: Type.Optional(paginationLimitSchema),
  },
  { additionalProperties: false },
);

export const auditLogSchema = Type.Object(
  {
    id: uuidSchema,
    action: Type.String({ maxLength: 100 }),
    entity: Type.String({ maxLength: 100 }),
    entityId: Type.Union([uuidSchema, Type.Null()]),
    branchId: Type.Union([uuidSchema, Type.Null()]),
    requestId: Type.Union([Type.String({ maxLength: 64 }), Type.Null()]),
    metadata: Type.Union([Type.String(), Type.Null()]),
    ipAddress: Type.Union([Type.String({ maxLength: 50 }), Type.Null()]),
    createdAt: Type.String({ format: "date-time" }),
    userId: Type.Union([uuidSchema, Type.Null()]),
    userName: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const auditLogListResponseSchema = successResponseSchema(
  Type.Array(auditLogSchema),
);
export type AuditLogResponse = Static<typeof auditLogSchema>;
