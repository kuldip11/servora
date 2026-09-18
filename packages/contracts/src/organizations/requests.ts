import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

const optionalNullableString = (maxLength: number) =>
  Type.Optional(Type.Union([Type.String({ maxLength }), Type.Null()]));

export const createOrganizationBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    businessType: optionalNullableString(50),
    country: optionalNullableString(2),
    timezone: optionalNullableString(64),
    currency: optionalNullableString(3),
    primaryContactName: optionalNullableString(150),
    businessEmail: Type.Optional(
      Type.Union([
        Type.String({ format: "email", maxLength: 255 }),
        Type.Null(),
      ]),
    ),
    businessPhone: optionalNullableString(30),
    addressLine1: optionalNullableString(300),
    addressLine2: optionalNullableString(300),
    city: optionalNullableString(120),
    stateProvince: optionalNullableString(120),
    postalCode: optionalNullableString(24),
    legalName: optionalNullableString(200),
    website: optionalNullableString(500),
    taxRegistrationNumber: optionalNullableString(100),
    gstin: optionalNullableString(15),
    pan: optionalNullableString(10),
    companyRegistrationNumber: optionalNullableString(100),
    logoUrl: optionalNullableString(1000),
  },
  { additionalProperties: false },
);

export const updateOrganizationBodySchema = Type.Partial(
  createOrganizationBodySchema,
);
export const organizationIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const organizationLoyaltyTierParamsSchema = Type.Object(
  {
    id: uuidSchema,
    tierId: uuidSchema,
  },
  { additionalProperties: false },
);
export const organizationMenuParamsSchema = Type.Object(
  {
    id: uuidSchema,
    menuId: uuidSchema,
  },
  { additionalProperties: false },
);

export const organizationMenuChannelSchema = Type.Union([
  Type.Literal("STAFF"),
  Type.Literal("CUSTOMER_QR"),
]);
export const organizationMenuFulfillmentSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
  Type.Literal("DELIVERY"),
  Type.Literal("ONLINE"),
]);
export const organizationMenuStatusSchema = Type.Union([
  Type.Literal("DRAFT"),
  Type.Literal("PUBLISHED"),
]);

export const organizationMenuItemRequestSchema = Type.Object(
  {
    itemSku: Type.String({ minLength: 1, maxLength: 50 }),
    categoryName: Type.Optional(
      Type.Union([Type.String({ maxLength: 100 }), Type.Null()]),
    ),
    sortOrder: Type.Optional(Type.Integer()),
  },
  { additionalProperties: false },
);

export const createOrganizationMenuBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(
      Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
    ),
    status: Type.Optional(organizationMenuStatusSchema),
    isDefault: Type.Optional(Type.Boolean()),
    availableChannels: Type.Optional(
      Type.Union([Type.Array(organizationMenuChannelSchema), Type.Null()]),
    ),
    availableFulfillmentTypes: Type.Optional(
      Type.Union([Type.Array(organizationMenuFulfillmentSchema), Type.Null()]),
    ),
    effectiveFrom: Type.Optional(
      Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
    ),
    items: Type.Array(organizationMenuItemRequestSchema),
  },
  { additionalProperties: false },
);
export const updateOrganizationMenuBodySchema = Type.Partial(
  createOrganizationMenuBodySchema,
);

export type CreateOrganizationRequest = Static<
  typeof createOrganizationBodySchema
>;
export type UpdateOrganizationRequest = Static<
  typeof updateOrganizationBodySchema
>;
export type OrganizationMenuRequest = Static<
  typeof createOrganizationMenuBodySchema
>;
export type UpdateOrganizationMenuRequest = Static<
  typeof updateOrganizationMenuBodySchema
>;
