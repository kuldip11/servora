import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";

const nullableDecimalString = Type.Union([
  Type.String({ pattern: "^-?\\d+(?:\\.\\d+)?$" }),
  Type.Null(),
]);

export const loyaltyTierSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: Type.Union([uuidSchema, Type.Null()]),
    organizationId: Type.Union([uuidSchema, Type.Null()]),
    name: Type.String(),
    discountPercent: nullableDecimalString,
    discountFixed: nullableDecimalString,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const loyaltyTierResponseSchema =
  successResponseSchema(loyaltyTierSchema);
export const loyaltyTierListResponseSchema = successResponseSchema(
  Type.Array(loyaltyTierSchema),
);
export const loyaltyTierDeleteResponseSchema = successResponseSchema(
  Type.Null(),
);

export type LoyaltyTierResponse = Static<typeof loyaltyTierSchema>;

export const loyaltyCustomerSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    organizationCustomerId: Type.Union([uuidSchema, Type.Null()]),
    name: Type.String(),
    email: Type.Union([Type.String(), Type.Null()]),
    phone: Type.Union([Type.String(), Type.Null()]),
    loyaltyTierId: Type.Union([uuidSchema, Type.Null()]),
    loyaltyTier: Type.Optional(Type.Union([loyaltyTierSchema, Type.Null()])),
  },
  { additionalProperties: false },
);

export const loyaltyCustomerResponseSchema = successResponseSchema(
  loyaltyCustomerSchema,
);
export const loyaltyCustomerListResponseSchema = successResponseSchema(
  Type.Array(loyaltyCustomerSchema),
);
export const loyaltyNullResponseSchema = successResponseSchema(Type.Null());

export type LoyaltyCustomerResponse = Static<typeof loyaltyCustomerSchema>;
