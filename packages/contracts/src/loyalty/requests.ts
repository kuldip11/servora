import { Type, type Static } from "@sinclair/typebox";

export const loyaltyTierBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 120 }),
    discountPercent: Type.Optional(
      Type.Union([
        Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
        Type.Null(),
      ]),
    ),
    discountFixed: Type.Optional(
      Type.Union([Type.Number({ exclusiveMinimum: 0 }), Type.Null()]),
    ),
  },
  { additionalProperties: false },
);

export const updateLoyaltyTierBodySchema = Type.Partial(loyaltyTierBodySchema);

export type LoyaltyTierRequest = Static<typeof loyaltyTierBodySchema>;
export type UpdateLoyaltyTierRequest = Static<
  typeof updateLoyaltyTierBodySchema
>;

export const loyaltyCustomerBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    email: Type.Optional(
      Type.Union([
        Type.String({ format: "email", maxLength: 320 }),
        Type.Null(),
      ]),
    ),
    phone: Type.Optional(
      Type.Union([Type.String({ maxLength: 40 }), Type.Null()]),
    ),
    loyaltyTierId: Type.Optional(
      Type.Union([
        Type.String({
          pattern:
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
        }),
        Type.Null(),
      ]),
    ),
  },
  { additionalProperties: false },
);
export const updateLoyaltyCustomerBodySchema = Type.Partial(
  loyaltyCustomerBodySchema,
);

export type LoyaltyCustomerRequest = Static<typeof loyaltyCustomerBodySchema>;
export type UpdateLoyaltyCustomerRequest = Static<
  typeof updateLoyaltyCustomerBodySchema
>;
