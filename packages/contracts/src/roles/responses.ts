import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";

export const publicRoleScopeSchema = Type.Union([
  Type.Literal("GLOBAL"),
  Type.Literal("TENANT"),
  Type.Literal("BRANCH"),
]);

export const roleResponseItemSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: Type.Union([uuidSchema, Type.Null()]),
    name: Type.String(),
    scope: publicRoleScopeSchema,
    description: Type.Union([Type.String(), Type.Null()]),
    isSystem: Type.Boolean(),
    isActive: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const rolesListResponseSchema = successResponseSchema(
  Type.Array(roleResponseItemSchema),
);
export const roleResponseSchema = successResponseSchema(roleResponseItemSchema);
export const roleArchivedResponseSchema = successResponseSchema(Type.Null());

export type RoleResponseItem = Static<typeof roleResponseItemSchema>;
