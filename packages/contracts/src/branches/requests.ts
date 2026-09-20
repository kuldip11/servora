import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

const optionalNullableString = (maxLength: number) =>
  Type.Optional(Type.Union([Type.String({ maxLength }), Type.Null()]));
const optionalNullablePercent = Type.Optional(
  Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
);

export const negativeStockPolicySchema = Type.Union([
  Type.Literal("BLOCK"),
  Type.Literal("ALLOW"),
  Type.Literal("WARN"),
]);

export const createBranchBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    code: Type.String({
      minLength: 2,
      maxLength: 24,
      pattern: "^[A-Za-z0-9-]+$",
    }),
    timezone: Type.String({ minLength: 1, maxLength: 64 }),
    currency: Type.String({
      minLength: 3,
      maxLength: 3,
      pattern: "^[A-Za-z]{3}$",
    }),
    address: Type.Optional(Type.String()),
    addressLine1: optionalNullableString(300),
    addressLine2: optionalNullableString(300),
    city: optionalNullableString(120),
    stateProvince: optionalNullableString(120),
    postalCode: optionalNullableString(24),
    country: optionalNullableString(2),
    phone: Type.Optional(Type.String({ maxLength: 30 })),
    managerName: optionalNullableString(150),
    email: optionalNullableString(255),
    openingTime: optionalNullableString(5),
    closingTime: optionalNullableString(5),
    weeklyOperatingDays: Type.Optional(
      Type.Union([Type.Array(Type.String(), { maxItems: 7 }), Type.Null()]),
    ),
    taxOverride: optionalNullablePercent,
    serviceChargeOverride: optionalNullablePercent,
    invoicePrefix: optionalNullableString(30),
    receiptFooter: optionalNullableString(1000),
    inventoryTrackingEnabled: Type.Optional(Type.Boolean()),
    negativeStockPolicy: Type.Optional(negativeStockPolicySchema),
    dineInEnabled: Type.Optional(Type.Boolean()),
    takeawayEnabled: Type.Optional(Type.Boolean()),
    deliveryEnabled: Type.Optional(Type.Boolean()),
    onlineEnabled: Type.Optional(Type.Boolean()),
    tablesEnabled: Type.Optional(Type.Boolean()),
    customerQrEnabled: Type.Optional(Type.Boolean()),
    kdsEnabled: Type.Optional(Type.Boolean()),
    waiterAppEnabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const updateBranchBodySchema = Type.Partial(createBranchBodySchema);
export const branchIdParamsSchema = Type.Object({ id: uuidSchema });

export type CreateBranchRequest = Static<typeof createBranchBodySchema>;
export type UpdateBranchRequest = Static<typeof updateBranchBodySchema>;
