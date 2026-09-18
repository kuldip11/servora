import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";

const nullableUuidSchema = Type.Union([uuidSchema, Type.Null()]);
const nullableStringSchema = Type.Union([Type.String(), Type.Null()]);

export const authPermissionSchema = Type.Object(
  {
    id: uuidSchema,
    key: Type.String(),
    module: Type.String(),
    description: Type.Optional(nullableStringSchema),
  },
  { additionalProperties: false },
);

export const authRoleSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    description: Type.Optional(Type.String()),
    permissions: Type.Array(authPermissionSchema),
  },
  { additionalProperties: false },
);

export const authUserSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: nullableUuidSchema,
    membershipId: Type.Optional(nullableUuidSchema),
    branchId: nullableUuidSchema,
    firstName: Type.String(),
    lastName: Type.String(),
    displayName: nullableStringSchema,
    email: Type.String({ format: "email" }),
    phone: nullableStringSchema,
    profileImageUrl: nullableStringSchema,
    status: Type.Union([
      Type.Literal("ACTIVE"),
      Type.Literal("INACTIVE"),
      Type.Literal("SUSPENDED"),
    ]),
    roles: Type.Array(authRoleSchema),
    permissions: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false },
);

export const signupResultSchema = Type.Object(
  { user: authUserSchema },
  { additionalProperties: false },
);
export const signupResponseSchema = successResponseSchema(signupResultSchema);

export const authTokenResultSchema = Type.Object(
  {
    accessToken: Type.String({ minLength: 1 }),
    expiresIn: Type.Integer({ minimum: 1 }),
    sessionId: uuidSchema,
    user: authUserSchema,
  },
  { additionalProperties: false },
);
export const authTokenResponseSchema = successResponseSchema(
  authTokenResultSchema,
);
export const authMeResponseSchema = successResponseSchema(authUserSchema);

export const membershipSummarySchema = Type.Object(
  {
    membershipId: uuidSchema,
    tenant: Type.Object(
      { id: uuidSchema, name: Type.String() },
      { additionalProperties: false },
    ),
    roles: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          name: Type.String(),
          scope: Type.Union([
            Type.Literal("GLOBAL"),
            Type.Literal("TENANT"),
            Type.Literal("BRANCH"),
          ]),
        },
        { additionalProperties: false },
      ),
    ),
    branches: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          name: Type.String(),
          address: Type.String(),
          isActive: Type.Boolean(),
          tablesEnabled: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export const membershipsResponseSchema = successResponseSchema(
  Type.Array(membershipSummarySchema),
);

export const authSessionSchema = Type.Object(
  {
    id: uuidSchema,
    userId: uuidSchema,
    createdAt: isoDateTimeSchema,
    lastSeenAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    revokedAt: Type.Union([isoDateTimeSchema, Type.Null()]),
    userAgent: nullableStringSchema,
    ipAddress: nullableStringSchema,
  },
  { additionalProperties: false },
);
export const authSessionsResponseSchema = successResponseSchema(
  Type.Array(authSessionSchema),
);
export const sessionRevokedResponseSchema = successResponseSchema(
  Type.Object({ revoked: Type.Boolean() }, { additionalProperties: false }),
);
export const logoutResponseSchema = successResponseSchema(
  Type.Object({ loggedOut: Type.Boolean() }, { additionalProperties: false }),
);
export const passwordChangedResponseSchema = successResponseSchema(
  Type.Object({ changed: Type.Boolean() }, { additionalProperties: false }),
);

export type AuthUserResponse = Static<typeof authUserSchema>;
export type AuthTokenResponse = Static<typeof authTokenResultSchema>;
export type AuthSessionResponse = Static<typeof authSessionSchema>;
export type MembershipSummaryResponse = Static<typeof membershipSummarySchema>;
