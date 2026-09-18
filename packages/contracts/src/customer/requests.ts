import { Type } from "@sinclair/typebox";
import { uuidSchema } from "../common";

export const customerRequestTypeSchema = Type.Union([
  Type.Literal("CALL_WAITER"),
  Type.Literal("WATER"),
  Type.Literal("CUTLERY"),
  Type.Literal("BILL"),
  Type.Literal("ASSISTANCE"),
]);
export const customerRequestStatusSchema = Type.Union([
  Type.Literal("OPEN"),
  Type.Literal("ACKNOWLEDGED"),
  Type.Literal("RESOLVED"),
  Type.Literal("CANCELLED"),
]);
export const createCustomerRequestBodySchema = Type.Object(
  {
    type: customerRequestTypeSchema,
    note: Type.Optional(Type.String({ maxLength: 500 })),
    orderId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);
export const customerRequestIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const updateCustomerRequestBodySchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("ACKNOWLEDGED"),
      Type.Literal("RESOLVED"),
      Type.Literal("CANCELLED"),
    ]),
  },
  { additionalProperties: false },
);

export const customerModeSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
]);

export const createCustomerSessionBodySchema = Type.Object(
  {
    qrToken: Type.String({ minLength: 1, maxLength: 512 }),
  },
  { additionalProperties: false },
);

const customerSelectedOptionSchema = Type.Object(
  {
    optionId: uuidSchema,
    quantity: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })),
    zoneLabel: Type.Optional(
      Type.Union([
        Type.Literal("LEFT"),
        Type.Literal("RIGHT"),
        Type.Literal("WHOLE"),
      ]),
    ),
  },
  { additionalProperties: false },
);

const customerOrderItemInputSchema = Type.Object(
  {
    menuItemId: uuidSchema,
    variantId: Type.Optional(uuidSchema),
    quantity: Type.Integer({ minimum: 1, maximum: 50 }),
    chefNotes: Type.Optional(Type.String({ maxLength: 500 })),
    fulfillmentType: Type.Optional(customerModeSchema),
    selectedOptions: Type.Optional(
      Type.Array(customerSelectedOptionSchema, { maxItems: 50 }),
    ),
  },
  { additionalProperties: false },
);

const customerComboSelectionSchema = Type.Object(
  {
    slotId: uuidSchema,
    optionIds: Type.Array(uuidSchema, { minItems: 1, maxItems: 50 }),
  },
  { additionalProperties: false },
);

const customerComboOrderSchema = Type.Object(
  {
    comboId: uuidSchema,
    quantity: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    selections: Type.Array(customerComboSelectionSchema, {
      minItems: 1,
      maxItems: 50,
    }),
  },
  { additionalProperties: false },
);

export const createCustomerOrderBodySchema = Type.Object(
  {
    fulfillmentType: Type.Optional(customerModeSchema),
    items: Type.Optional(
      Type.Array(customerOrderItemInputSchema, { minItems: 1, maxItems: 100 }),
    ),
    combos: Type.Optional(
      Type.Array(customerComboOrderSchema, { minItems: 1, maxItems: 50 }),
    ),
    notes: Type.Optional(Type.String({ maxLength: 1000 })),
    couponCode: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    loyaltyPhone: Type.Optional(Type.String({ minLength: 3, maxLength: 40 })),
  },
  { additionalProperties: false },
);

export const customerOrderIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const customerCheckoutBodySchema = Type.Object(
  {
    method: Type.Literal("CASH"),
    billId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const takeawayPaymentVerificationBodySchema = Type.Object(
  {
    razorpayOrderId: Type.String({ minLength: 1, maxLength: 255 }),
    razorpayPaymentId: Type.String({ minLength: 1, maxLength: 255 }),
    razorpaySignature: Type.String({ minLength: 1, maxLength: 512 }),
  },
  { additionalProperties: false },
);
