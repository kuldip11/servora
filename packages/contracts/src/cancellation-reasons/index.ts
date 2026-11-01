import { Type, type Static } from "@sinclair/typebox";
import { successResponseSchema, uuidSchema } from "../common";

export const cancellationReasonIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const cancellationReasonListQuerySchema = Type.Object(
  {
    activeOnly: Type.Optional(
      Type.Union([Type.Literal("true"), Type.Literal("false")]),
    ),
  },
  { additionalProperties: false },
);
export const createCancellationReasonBodySchema = Type.Object(
  { label: Type.String({ minLength: 1, maxLength: 120 }) },
  { additionalProperties: false },
);
export const updateCancellationReasonBodySchema = Type.Partial(
  Type.Object(
    {
      label: Type.String({ minLength: 1, maxLength: 120 }),
      isActive: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
  { minProperties: 1, additionalProperties: false },
);

export const cancellationReasonSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    label: Type.String({ minLength: 1, maxLength: 120 }),
    isActive: Type.Boolean(),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);
export const cancellationReasonResponseSchema = successResponseSchema(
  cancellationReasonSchema,
);
export const cancellationReasonListResponseSchema = successResponseSchema(
  Type.Array(cancellationReasonSchema),
);
export type CancellationReasonResponse = Static<
  typeof cancellationReasonSchema
>;
