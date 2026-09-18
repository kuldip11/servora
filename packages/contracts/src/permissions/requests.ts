import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const rolePermissionParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const setRolePermissionsBodySchema = Type.Object(
  {
    permissionIds: Type.Array(uuidSchema, { uniqueItems: true }),
  },
  { additionalProperties: false },
);

export type SetRolePermissionsRequest = Static<
  typeof setRolePermissionsBodySchema
>;
