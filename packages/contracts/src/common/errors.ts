import { Type, type Static } from "@sinclair/typebox";

export const apiFieldErrorsSchema = Type.Record(
  Type.String({ minLength: 1 }),
  Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
);

export const apiErrorPayloadSchema = Type.Object(
  {
    code: Type.String({
      minLength: 3,
      maxLength: 80,
      pattern: "^[A-Z][A-Z0-9_]+$",
    }),
    message: Type.String({ minLength: 1 }),
    retryable: Type.Boolean(),
    requestId: Type.String({ minLength: 1 }),
    fieldErrors: Type.Optional(apiFieldErrorsSchema),
  },
  { additionalProperties: false },
);

export const apiErrorResponseSchema = Type.Object(
  {
    success: Type.Literal(false),
    error: apiErrorPayloadSchema,
  },
  { additionalProperties: false },
);

export type ApiFieldErrors = Static<typeof apiFieldErrorsSchema>;
export type ApiErrorPayload = Static<typeof apiErrorPayloadSchema>;
export type ApiErrorResponse = Static<typeof apiErrorResponseSchema>;
