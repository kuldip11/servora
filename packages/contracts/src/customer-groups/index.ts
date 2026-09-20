import { Type, type Static } from "@sinclair/typebox";
import { successResponseSchema, uuidSchema } from "../common";

export const customerGroupIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

const customerGroupInputProperties = {
  name: Type.String({ minLength: 1, maxLength: 150 }),
  discountPercent: Type.Optional(
    Type.Union([
      Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
      Type.Null(),
    ]),
  ),
  discountFixed: Type.Optional(
    Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
  ),
};

export const createCustomerGroupBodySchema = Type.Object(
  customerGroupInputProperties,
  { additionalProperties: false },
);
export const updateCustomerGroupBodySchema = Type.Partial(
  Type.Object(customerGroupInputProperties, { additionalProperties: false }),
  { minProperties: 1, additionalProperties: false },
);

export const customerGroupSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String({ minLength: 1, maxLength: 150 }),
    discountPercent: Type.Union([Type.Number(), Type.Null()]),
    discountFixed: Type.Union([Type.Number(), Type.Null()]),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export const customerGroupResponseSchema =
  successResponseSchema(customerGroupSchema);
export const customerGroupListResponseSchema = successResponseSchema(
  Type.Array(customerGroupSchema),
);
export type CustomerGroupResponse = Static<typeof customerGroupSchema>;
