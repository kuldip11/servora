import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const signupBodySchema = Type.Object(
  {
    firstName: Type.String({ minLength: 1, maxLength: 50 }),
    lastName: Type.String({ minLength: 1, maxLength: 50 }),
    email: Type.String({ format: "email", maxLength: 255 }),
    password: Type.String({ minLength: 8, maxLength: 100 }),
  },
  { additionalProperties: false },
);

export const loginBodySchema = Type.Object(
  {
    email: Type.String({ format: "email", maxLength: 255 }),
    password: Type.String({ minLength: 1, maxLength: 100 }),
  },
  { additionalProperties: false },
);

export const updateProfileBodySchema = Type.Object(
  {
    firstName: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    lastName: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    displayName: Type.Optional(
      Type.Union([Type.String({ maxLength: 150 }), Type.Null()]),
    ),
    phone: Type.Optional(
      Type.Union([Type.String({ maxLength: 30 }), Type.Null()]),
    ),
    profileImageUrl: Type.Optional(
      Type.Union([
        Type.String({ format: "uri", maxLength: 1000 }),
        Type.Null(),
      ]),
    ),
  },
  { additionalProperties: false },
);

export const changePasswordBodySchema = Type.Object(
  {
    currentPassword: Type.String({ minLength: 1, maxLength: 100 }),
    newPassword: Type.String({ minLength: 8, maxLength: 100 }),
  },
  { additionalProperties: false },
);

export const sessionIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export type SignupRequest = Static<typeof signupBodySchema>;
export type LoginRequest = Static<typeof loginBodySchema>;
export type UpdateProfileRequest = Static<typeof updateProfileBodySchema>;
export type ChangePasswordRequest = Static<typeof changePasswordBodySchema>;
