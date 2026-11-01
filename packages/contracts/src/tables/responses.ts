import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { tableStatusSchema } from "./requests";

export const tableSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    name: Type.String(),
    publicQrToken: uuidSchema,
    capacity: Type.Integer({ minimum: 1 }),
    status: tableStatusSchema,
    section: Type.Union([Type.String(), Type.Null()]),
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const tableResponseSchema = successResponseSchema(tableSchema);
export const tableListResponseSchema = successResponseSchema(
  Type.Array(tableSchema),
);
export const tableDeleteResponseSchema = successResponseSchema(Type.Null());

export type TableResponse = Static<typeof tableSchema>;
