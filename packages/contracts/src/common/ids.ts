import { Type, type Static } from "@sinclair/typebox";

export const uuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});
export const optionalUuidSchema = Type.Optional(uuidSchema);

export const idParamsSchema = Type.Object({ id: uuidSchema });

export const organizationIdSchema = uuidSchema;
export const tenantIdSchema = uuidSchema;
export const branchIdSchema = uuidSchema;

export type IdParams = Static<typeof idParamsSchema>;
