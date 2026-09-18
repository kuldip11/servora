import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { tenantSchema } from "../tenants/responses";
import {
  organizationMenuChannelSchema,
  organizationMenuFulfillmentSchema,
  organizationMenuStatusSchema,
} from "./requests";

const nullableString = Type.Union([Type.String(), Type.Null()]);

export const organizationSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    businessType: nullableString,
    country: nullableString,
    timezone: nullableString,
    currency: nullableString,
    primaryContactName: nullableString,
    businessEmail: nullableString,
    businessPhone: nullableString,
    addressLine1: nullableString,
    addressLine2: nullableString,
    city: nullableString,
    stateProvince: nullableString,
    postalCode: nullableString,
    legalName: nullableString,
    website: nullableString,
    taxRegistrationNumber: nullableString,
    gstin: nullableString,
    pan: nullableString,
    companyRegistrationNumber: nullableString,
    logoUrl: nullableString,
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const organizationMenuItemSchema = Type.Object(
  {
    id: uuidSchema,
    menuId: uuidSchema,
    itemSku: Type.String(),
    categoryName: nullableString,
    sortOrder: Type.Integer(),
    createdAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const organizationMenuSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: Type.Union([uuidSchema, Type.Null()]),
    organizationId: Type.Union([uuidSchema, Type.Null()]),
    name: Type.String(),
    description: nullableString,
    status: organizationMenuStatusSchema,
    isDefault: Type.Boolean(),
    availableChannels: Type.Union([
      Type.Array(organizationMenuChannelSchema),
      Type.Null(),
    ]),
    availableFulfillmentTypes: Type.Union([
      Type.Array(organizationMenuFulfillmentSchema),
      Type.Null(),
    ]),
    availableBranchIds: Type.Union([Type.Array(uuidSchema), Type.Null()]),
    effectiveFrom: Type.Union([isoDateTimeSchema, Type.Null()]),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    organizationItems: Type.Array(organizationMenuItemSchema),
  },
  { additionalProperties: false },
);

export const organizationListResponseSchema = successResponseSchema(
  Type.Array(organizationSchema),
);
export const organizationResponseSchema =
  successResponseSchema(organizationSchema);
export const organizationCreatedSchema = Type.Object(
  {
    organization: organizationSchema,
    membershipId: uuidSchema,
  },
  { additionalProperties: false },
);
export const organizationCreatedResponseSchema = successResponseSchema(
  organizationCreatedSchema,
);
export const organizationTenantsResponseSchema = successResponseSchema(
  Type.Array(tenantSchema),
);
export const organizationMenusResponseSchema = successResponseSchema(
  Type.Array(organizationMenuSchema),
);
export const organizationMenuResponseSchema = successResponseSchema(
  organizationMenuSchema,
);
export const organizationNullResponseSchema = successResponseSchema(
  Type.Null(),
);

export type OrganizationResponse = Static<typeof organizationSchema>;
export type OrganizationCreatedResponse = Static<
  typeof organizationCreatedSchema
>;
export type OrganizationMenuResponse = Static<typeof organizationMenuSchema>;
