import { Type, type Static } from "@sinclair/typebox";
import {
  isoDateTimeSchema,
  successResponseSchema,
  uuidSchema,
} from "../common";
import {
  customerModeSchema,
  customerRequestStatusSchema,
  customerRequestTypeSchema,
} from "./requests";
import { orderSchema, orderStatusSchema } from "../orders";

const nullableString = Type.Union([Type.String(), Type.Null()]);
const nullableUuid = Type.Union([uuidSchema, Type.Null()]);
const moneySchema = Type.Union([Type.Number(), Type.String()]);

export const customerRequestSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    tableId: uuidSchema,
    customerSessionId: uuidSchema,
    orderId: nullableUuid,
    type: customerRequestTypeSchema,
    status: customerRequestStatusSchema,
    note: nullableString,
    resolvedBy: nullableUuid,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const customerRequestResponseSchema = successResponseSchema(
  customerRequestSchema,
);
export const customerRequestListResponseSchema = successResponseSchema(
  Type.Array(customerRequestSchema),
);
export type CustomerRequestResponse = Static<typeof customerRequestSchema>;

export const customerSessionSchema = Type.Object(
  {
    sessionToken: Type.String({ minLength: 1 }),
    expiresAt: isoDateTimeSchema,
    mode: customerModeSchema,
    restaurant: Type.Object(
      { id: uuidSchema, name: Type.String() },
      { additionalProperties: false },
    ),
    table: Type.Union([
      Type.Object(
        { id: uuidSchema, name: Type.String(), section: nullableString },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);
export const customerSessionResponseSchema = successResponseSchema(
  customerSessionSchema,
);

const customerMenuVariantSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    price: moneySchema,
    status: Type.Optional(Type.String()),
    manualOverrideStatus: Type.Optional(nullableString),
    manualOverrideReason: Type.Optional(nullableString),
    manualStockCount: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
  },
  { additionalProperties: false },
);

const customerModifierOptionSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    additionalPrice: moneySchema,
    isAvailable: Type.Boolean(),
    maxQuantity: Type.Integer({ minimum: 1 }),
    isDefault: Type.Optional(Type.Boolean()),
    variantPrices: Type.Optional(
      Type.Array(
        Type.Object(
          {
            variantId: uuidSchema,
            additionalPrice: moneySchema,
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
);

const customerModifierGroupSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    selectionType: Type.Union([
      Type.Literal("SINGLE"),
      Type.Literal("MULTIPLE"),
    ]),
    minSelections: Type.Integer({ minimum: 0 }),
    maxSelections: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    dependsOnOptionId: Type.Optional(nullableUuid),
    options: Type.Array(customerModifierOptionSchema),
  },
  { additionalProperties: false },
);

export const customerMenuItemSchema = Type.Object(
  {
    id: uuidSchema,
    categoryId: uuidSchema,
    name: Type.String(),
    description: nullableString,
    basePrice: moneySchema,
    taxRate: moneySchema,
    imageUrl: nullableString,
    foodType: Type.Union([
      Type.Literal("VEG"),
      Type.Literal("NON_VEG"),
      Type.Literal("EGG"),
    ]),
    spiceLevel: Type.Union([
      Type.Literal("NONE"),
      Type.Literal("MILD"),
      Type.Literal("MEDIUM"),
      Type.Literal("HOT"),
      Type.Null(),
    ]),
    prepTimeMinutes: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    displayMode: Type.Optional(
      Type.Union([Type.Literal("STANDARD"), Type.Literal("GUIDED_BUILDER")]),
    ),
    pricingMode: Type.Optional(
      Type.Union([
        Type.Literal("FIXED"),
        Type.Literal("WEIGHT_BASED"),
        Type.Literal("OPEN"),
      ]),
    ),
    weightUnit: Type.Optional(
      Type.Union([
        Type.Literal("G"),
        Type.Literal("KG"),
        Type.Literal("LB"),
        Type.Literal("OZ"),
        Type.Null(),
      ]),
    ),
    openPriceMin: Type.Optional(Type.Union([moneySchema, Type.Null()])),
    openPriceMax: Type.Optional(Type.Union([moneySchema, Type.Null()])),
    supportsZones: Type.Optional(Type.Boolean()),
    zonePricingRule: Type.Optional(
      Type.Union([
        Type.Literal("AVERAGE"),
        Type.Literal("HIGHER"),
        Type.Literal("SUM_HALF"),
      ]),
    ),
    manualStockCount: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
    variants: Type.Array(customerMenuVariantSchema),
    modifierGroupLinks: Type.Array(
      Type.Object(
        {
          sortOrder: Type.Optional(Type.Integer()),
          group: customerModifierGroupSchema,
        },
        { additionalProperties: false },
      ),
    ),
    tagLinks: Type.Array(
      Type.Object(
        {
          tag: Type.Object(
            { name: Type.String() },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
    images: Type.Array(
      Type.Object(
        { url: Type.String(), sortOrder: Type.Integer() },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const customerComboSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    description: nullableString,
    pricePolicy: Type.Union([
      Type.Literal("FIXED"),
      Type.Literal("PERCENT_OFF_SUM"),
    ]),
    fixedPrice: Type.Union([moneySchema, Type.Null()]),
    percentOff: Type.Union([moneySchema, Type.Null()]),
    slots: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          name: Type.String(),
          minSelections: Type.Integer({ minimum: 0 }),
          maxSelections: Type.Integer({ minimum: 0 }),
          sortOrder: Type.Integer(),
          options: Type.Array(
            Type.Object(
              {
                id: uuidSchema,
                menuItemId: uuidSchema,
                variantId: nullableUuid,
                upcharge: moneySchema,
              },
              { additionalProperties: false },
            ),
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const customerMenuSchema = Type.Object(
  {
    restaurant: Type.Object(
      {
        id: uuidSchema,
        name: Type.String(),
        address: Type.String(),
      },
      { additionalProperties: false },
    ),
    mode: customerModeSchema,
    table: Type.Union([
      Type.Object(
        { id: uuidSchema, name: Type.String(), section: nullableString },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
    categories: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          name: Type.String(),
          sortOrder: Type.Integer(),
        },
        { additionalProperties: false },
      ),
    ),
    combos: Type.Array(customerComboSchema),
    items: Type.Array(customerMenuItemSchema),
  },
  { additionalProperties: false },
);
export const customerMenuResponseSchema =
  successResponseSchema(customerMenuSchema);

export const customerOrderResponseSchema = successResponseSchema(orderSchema);

export const customerCheckoutSchema = Type.Object(
  {
    payment: Type.Object(
      {
        id: uuidSchema,
        method: Type.Literal("CASH"),
        status: Type.Union([
          Type.Literal("PENDING"),
          Type.Literal("SUCCESS"),
          Type.Literal("FAILED"),
          Type.Literal("REFUNDED"),
        ]),
        amount: moneySchema,
        reference: nullableString,
      },
      { additionalProperties: false },
    ),
    orderStatus: orderStatusSchema,
    paymentRequired: Type.Boolean(),
    method: Type.Literal("CASH"),
  },
  { additionalProperties: false },
);
export const customerCheckoutResponseSchema = successResponseSchema(
  customerCheckoutSchema,
);

export const customerTakeawayPaymentSchema = Type.Object(
  {
    id: uuidSchema,
    amount: moneySchema,
    reference: nullableString,
    gatewayOrderId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export const customerTakeawayPaymentResponseSchema = successResponseSchema(
  customerTakeawayPaymentSchema,
);

export type CustomerSessionResponse = Static<typeof customerSessionSchema>;
export type CustomerMenuResponse = Static<typeof customerMenuSchema>;
export type CustomerCheckoutResponse = Static<typeof customerCheckoutSchema>;
export type CustomerTakeawayPaymentResponse = Static<
  typeof customerTakeawayPaymentSchema
>;
