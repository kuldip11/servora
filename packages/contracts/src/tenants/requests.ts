import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

const optionalNullableString = (maxLength: number) =>
  Type.Optional(Type.Union([Type.String({ maxLength }), Type.Null()]));
const optionalPercent = Type.Optional(
  Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
);

export const taxModeSchema = Type.Union([
  Type.Literal("INCLUSIVE"),
  Type.Literal("EXCLUSIVE"),
]);
export const roundingPolicySchema = Type.Union([
  Type.Literal("NONE"),
  Type.Literal("NEAREST_1"),
  Type.Literal("NEAREST_5"),
  Type.Literal("NEAREST_10"),
]);

export const createTenantBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    organizationId: uuidSchema,
    displayName: optionalNullableString(200),
    description: optionalNullableString(2000),
    cuisineTypes: Type.Optional(
      Type.Array(Type.String({ minLength: 1, maxLength: 80 }), {
        maxItems: 20,
      }),
    ),
    businessModel: optionalNullableString(50),
    defaultCurrency: optionalNullableString(3),
    defaultTimezone: optionalNullableString(64),
    supportEmail: Type.Optional(
      Type.Union([
        Type.String({ format: "email", maxLength: 255 }),
        Type.Null(),
      ]),
    ),
    supportPhone: optionalNullableString(30),
    website: optionalNullableString(500),
    logoUrl: optionalNullableString(1000),
    primaryBrandImageUrl: optionalNullableString(1000),
    defaultTaxMode: Type.Optional(taxModeSchema),
    defaultTaxRate: optionalPercent,
    dineInEnabled: Type.Optional(Type.Boolean()),
    takeawayEnabled: Type.Optional(Type.Boolean()),
    deliveryEnabled: Type.Optional(Type.Boolean()),
    customerQrEnabled: Type.Optional(Type.Boolean()),
    tableManagementEnabled: Type.Optional(Type.Boolean()),
    kdsEnabled: Type.Optional(Type.Boolean()),
    waiterServiceEnabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const updateTenantBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    displayName: optionalNullableString(200),
    description: optionalNullableString(2000),
    cuisineTypes: Type.Optional(
      Type.Union([
        Type.Array(Type.String({ minLength: 1, maxLength: 80 }), {
          maxItems: 20,
        }),
        Type.Null(),
      ]),
    ),
    businessModel: optionalNullableString(50),
    defaultCurrency: optionalNullableString(3),
    defaultTimezone: optionalNullableString(64),
    supportEmail: Type.Optional(
      Type.Union([
        Type.String({ format: "email", maxLength: 255 }),
        Type.Null(),
      ]),
    ),
    supportPhone: optionalNullableString(30),
    website: optionalNullableString(500),
    logoUrl: optionalNullableString(1000),
    primaryBrandImageUrl: optionalNullableString(1000),
    serviceChargePercent: optionalPercent,
    serviceChargeTaxable: Type.Optional(Type.Boolean()),
    roundingPolicy: Type.Optional(roundingPolicySchema),
    defaultTaxMode: Type.Optional(taxModeSchema),
    defaultTaxRate: optionalPercent,
    dineInEnabled: Type.Optional(Type.Boolean()),
    takeawayEnabled: Type.Optional(Type.Boolean()),
    deliveryEnabled: Type.Optional(Type.Boolean()),
    customerQrEnabled: Type.Optional(Type.Boolean()),
    tableManagementEnabled: Type.Optional(Type.Boolean()),
    kdsEnabled: Type.Optional(Type.Boolean()),
    waiterServiceEnabled: Type.Optional(Type.Boolean()),
    courseSequencingEnabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const tenantIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export type CreateTenantRequest = Static<typeof createTenantBodySchema>;
export type UpdateTenantRequest = Static<typeof updateTenantBodySchema>;
