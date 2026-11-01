import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { publicRoleScopeSchema } from "../roles/responses";
import { roundingPolicySchema, taxModeSchema } from "./requests";

const nullableString = Type.Union([Type.String(), Type.Null()]);
const nullableDecimalString = Type.Union([
  Type.String({ pattern: "^-?\\d+(?:\\.\\d+)?$" }),
  Type.Null(),
]);

export const tenantSchema = Type.Object(
  {
    id: uuidSchema,
    organizationId: uuidSchema,
    name: Type.String(),
    displayName: nullableString,
    description: nullableString,
    cuisineTypes: Type.Union([Type.Array(Type.String()), Type.Null()]),
    businessModel: nullableString,
    defaultCurrency: nullableString,
    defaultTimezone: nullableString,
    supportEmail: nullableString,
    supportPhone: nullableString,
    website: nullableString,
    logoUrl: nullableString,
    primaryBrandImageUrl: nullableString,
    plan: Type.String(),
    isActive: Type.Boolean(),
    serviceChargePercent: nullableDecimalString,
    serviceChargeTaxable: Type.Boolean(),
    roundingPolicy: roundingPolicySchema,
    defaultTaxMode: taxModeSchema,
    defaultTaxRate: nullableDecimalString,
    dineInEnabled: Type.Boolean(),
    takeawayEnabled: Type.Boolean(),
    deliveryEnabled: Type.Boolean(),
    customerQrEnabled: Type.Boolean(),
    tableManagementEnabled: Type.Boolean(),
    kdsEnabled: Type.Boolean(),
    waiterServiceEnabled: Type.Boolean(),
    courseSequencingEnabled: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const tenantRoleSummarySchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    scope: publicRoleScopeSchema,
  },
  { additionalProperties: false },
);

export const availableTenantSchema = Type.Object(
  {
    membershipId: uuidSchema,
    tenant: tenantSchema,
    roles: Type.Array(tenantRoleSummarySchema),
    branchIds: Type.Array(uuidSchema),
  },
  { additionalProperties: false },
);

export const tenantListResponseSchema = successResponseSchema(
  Type.Array(availableTenantSchema),
);
export const tenantResponseSchema = successResponseSchema(tenantSchema);
export const tenantCreatedSchema = Type.Object(
  {
    tenant: tenantSchema,
    membershipId: uuidSchema,
  },
  { additionalProperties: false },
);
export const tenantCreatedResponseSchema =
  successResponseSchema(tenantCreatedSchema);

export type TenantResponse = Static<typeof tenantSchema>;
export type AvailableTenantResponse = Static<typeof availableTenantSchema>;
export type TenantCreatedResponse = Static<typeof tenantCreatedSchema>;
