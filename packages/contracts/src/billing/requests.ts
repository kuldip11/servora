import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const paymentMethodSchema = Type.Union([
  Type.Literal("CASH"),
  Type.Literal("CARD"),
  Type.Literal("UPI"),
  Type.Literal("RAZORPAY"),
  Type.Literal("STRIPE"),
]);

export const createPaymentBodySchema = Type.Object(
  {
    orderId: uuidSchema,
    billId: Type.Optional(uuidSchema),
    method: paymentMethodSchema,
    amount: Type.Number({ minimum: 0.01 }),
    reference: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  },
  { additionalProperties: false },
);

export const createRefundBodySchema = Type.Object(
  {
    paymentId: uuidSchema,
    amount: Type.Number({ minimum: 0.01 }),
    reason: Type.String({ minLength: 1, maxLength: 500 }),
  },
  { additionalProperties: false },
);

export const billIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const billingOrderIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const orderItemSeatShareParamsSchema = Type.Object(
  {
    id: uuidSchema,
    itemId: uuidSchema,
  },
  { additionalProperties: false },
);

export const itemSeatSharesBodySchema = Type.Object(
  {
    shares: Type.Array(
      Type.Object(
        {
          seatLabel: Type.String({ minLength: 1, maxLength: 50 }),
          shareRatio: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
        },
        { additionalProperties: false },
      ),
      { minItems: 2, maxItems: 20 },
    ),
  },
  { additionalProperties: false },
);

export const splitBillBodySchema = Type.Object(
  {
    ways: Type.Integer({ minimum: 2, maximum: 20 }),
  },
  { additionalProperties: false },
);

export const billItemAllocationSchema = Type.Object(
  {
    label: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    orderItemIds: Type.Array(uuidSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

export const splitByItemsBodySchema = Type.Object(
  {
    allocations: Type.Array(billItemAllocationSchema, {
      minItems: 2,
      maxItems: 20,
    }),
  },
  { additionalProperties: false },
);

export const splitBySeatBodySchema = Type.Object(
  {
    sharedItemStrategy: Type.Union([
      Type.Literal("EVEN_SPLIT"),
      Type.Literal("MANUAL"),
    ]),
  },
  { additionalProperties: false },
);

export const razorpayWebhookPaymentEntitySchema = Type.Object(
  {
    id: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    order_id: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    status: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    amount: Type.Optional(Type.Integer({ minimum: 0 })),
    currency: Type.Optional(Type.String({ minLength: 3, maxLength: 12 })),
  },
  { additionalProperties: true },
);

export const razorpayWebhookOrderEntitySchema = Type.Object(
  {
    id: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    status: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: true },
);

export const razorpayWebhookPayloadSchema = Type.Object(
  {
    event: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
    payload: Type.Optional(
      Type.Object(
        {
          payment: Type.Optional(
            Type.Object(
              {
                entity: Type.Optional(razorpayWebhookPaymentEntitySchema),
              },
              { additionalProperties: true },
            ),
          ),
          order: Type.Optional(
            Type.Object(
              {
                entity: Type.Optional(razorpayWebhookOrderEntitySchema),
              },
              { additionalProperties: true },
            ),
          ),
        },
        { additionalProperties: true },
      ),
    ),
  },
  { additionalProperties: true },
);

export type RazorpayWebhookPayload = Static<
  typeof razorpayWebhookPayloadSchema
>;

export type CreatePaymentRequest = Static<typeof createPaymentBodySchema>;
export type CreateRefundRequest = Static<typeof createRefundBodySchema>;
export type BillItemAllocationRequest = Static<typeof billItemAllocationSchema>;
export type ItemSeatSharesRequest = Static<typeof itemSeatSharesBodySchema>;
