import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { roleResponseItemSchema } from "../roles/responses";

export const permissionResponseItemSchema = Type.Object(
  {
    id: uuidSchema,
    key: Type.String(),
    module: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const permissionsListResponseSchema = successResponseSchema(
  Type.Array(permissionResponseItemSchema),
);

export const roleWithPermissionsSchema = Type.Intersect([
  roleResponseItemSchema,
  Type.Object(
    { permissions: Type.Array(permissionResponseItemSchema) },
    { additionalProperties: false },
  ),
]);

export const rolePermissionsResponseSchema = successResponseSchema(
  Type.Array(permissionResponseItemSchema),
);
export const rolePermissionsUpdatedResponseSchema = successResponseSchema(
  roleWithPermissionsSchema,
);

export type PermissionResponseItem = Static<
  typeof permissionResponseItemSchema
>;
export type RoleWithPermissionsResponse = Static<
  typeof roleWithPermissionsSchema
>;
