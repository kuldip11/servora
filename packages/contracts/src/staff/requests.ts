import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";
import {
  paginationLimitSchema,
  paginationPageSchema,
} from "../common/pagination";

export const staffStatusSchema = Type.Union([
  Type.Literal("ACTIVE"),
  Type.Literal("INACTIVE"),
  Type.Literal("SUSPENDED"),
]);

export const createStaffBodySchema = Type.Object(
  {
    firstName: Type.String({ minLength: 1, maxLength: 100 }),
    lastName: Type.String({ minLength: 1, maxLength: 100 }),
    email: Type.String({ format: "email", maxLength: 255 }),
    password: Type.String({ minLength: 8, maxLength: 128 }),
    roleId: uuidSchema,
    branchIds: Type.Optional(
      Type.Array(uuidSchema, { uniqueItems: true, maxItems: 100 }),
    ),
  },
  { additionalProperties: false },
);

export const updateStaffBodySchema = Type.Object(
  {
    firstName: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    lastName: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    status: Type.Optional(staffStatusSchema),
    roleId: Type.Optional(uuidSchema),
    branchIds: Type.Optional(
      Type.Array(uuidSchema, { uniqueItems: true, maxItems: 100 }),
    ),
  },
  { additionalProperties: false },
);

export const staffIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const staffListQuerySchema = Type.Object(
  {
    page: Type.Optional(paginationPageSchema),
    limit: Type.Optional(paginationLimitSchema),
    search: Type.Optional(Type.String({ maxLength: 100 })),
    status: Type.Optional(staffStatusSchema),
  },
  { additionalProperties: false },
);

export type CreateStaffRequest = Static<typeof createStaffBodySchema>;
export type UpdateStaffRequest = Static<typeof updateStaffBodySchema>;
export type StaffListQuery = Static<typeof staffListQuerySchema>;
