import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { negativeStockPolicySchema } from "./requests";

const nullableString = Type.Union([Type.String(), Type.Null()]);
const nullableDecimalString = Type.Union([
  Type.String({ pattern: "^-?\\d+(?:\\.\\d+)?$" }),
  Type.Null(),
]);

export const branchSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String(),
    code: Type.String(),
    timezone: Type.String(),
    currency: Type.String(),
    address: Type.String(),
    addressLine1: nullableString,
    addressLine2: nullableString,
    city: nullableString,
    stateProvince: nullableString,
    postalCode: nullableString,
    country: nullableString,
    phone: nullableString,
    managerName: nullableString,
    email: nullableString,
    openingTime: nullableString,
    closingTime: nullableString,
    weeklyOperatingDays: Type.Union([Type.Array(Type.String()), Type.Null()]),
    taxOverride: nullableDecimalString,
    serviceChargeOverride: nullableDecimalString,
    invoicePrefix: nullableString,
    receiptFooter: nullableString,
    inventoryTrackingEnabled: Type.Boolean(),
    negativeStockPolicy: negativeStockPolicySchema,
    isActive: Type.Boolean(),
    dineInEnabled: Type.Boolean(),
    takeawayEnabled: Type.Boolean(),
    deliveryEnabled: Type.Boolean(),
    onlineEnabled: Type.Boolean(),
    tablesEnabled: Type.Boolean(),
    customerQrEnabled: Type.Boolean(),
    kdsEnabled: Type.Boolean(),
    waiterAppEnabled: Type.Boolean(),
    publicTakeawayQrToken: uuidSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const branchResponseSchema = successResponseSchema(branchSchema);
export const branchListResponseSchema = successResponseSchema(
  Type.Array(branchSchema),
);
export const branchTakeawayQrSchema = Type.Object(
  {
    branchId: uuidSchema,
    branchName: Type.String(),
    enabled: Type.Boolean(),
    token: uuidSchema,
  },
  { additionalProperties: false },
);
export const branchTakeawayQrResponseSchema = successResponseSchema(
  branchTakeawayQrSchema,
);
export const nullSuccessResponseSchema = successResponseSchema(Type.Null());

export type BranchResponse = Static<typeof branchSchema>;
export type BranchTakeawayQrResponse = Static<typeof branchTakeawayQrSchema>;
