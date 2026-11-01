import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const roleIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const roleScopeSchema = Type.Union([
  Type.Literal("TENANT"),
  Type.Literal("BRANCH"),
]);

export const createRoleBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 2, maxLength: 80 }),
    description: Type.Optional(Type.String({ maxLength: 500 })),
    scope: roleScopeSchema,
  },
  { additionalProperties: false },
);

export const updateRoleBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 2, maxLength: 80 })),
    description: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false, minProperties: 1 },
);

export type CreateRoleRequest = Static<typeof createRoleBodySchema>;
export type UpdateRoleRequest = Static<typeof updateRoleBodySchema>;
