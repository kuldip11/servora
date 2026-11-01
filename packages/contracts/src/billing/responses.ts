import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { paymentMethodSchema } from "./requests";

const nullableUuidSchema = Type.Union([uuidSchema, Type.Null()]);
const nullableStringSchema = Type.Union([Type.String(), Type.Null()]);

export const paymentStatusSchema = Type.Union([
  Type.Literal("PENDING"),
  Type.Literal("SUCCESS"),
  Type.Literal("FAILED"),
  Type.Literal("REFUNDED"),
]);

export const billingPaymentSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    billId: nullableUuidSchema,
    method: paymentMethodSchema,
    status: paymentStatusSchema,
    amount: Type.Number(),
    reference: nullableStringSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const billAssignmentOrderItemSchema = Type.Object(
  {
    menuItemId: nullableUuidSchema,
    menuItemName: Type.String(),
    quantity: Type.Integer({ minimum: 1 }),
    taxMode: Type.Union([Type.Literal("INCLUSIVE"), Type.Literal("EXCLUSIVE")]),
    comboId: nullableUuidSchema,
    comboGroupId: nullableUuidSchema,
    order: Type.Object(
      {
        id: uuidSchema,
        table: Type.Union([
          Type.Object({ name: Type.String() }, { additionalProperties: false }),
          Type.Null(),
        ]),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const billItemAssignmentSchema = Type.Object(
  {
    id: uuidSchema,
    billId: uuidSchema,
    orderItemId: uuidSchema,
    allocationRatio: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
    orderItem: billAssignmentOrderItemSchema,
  },
  { additionalProperties: false },
);

export const billSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    splitLabel: nullableStringSchema,
    subtotal: Type.Number(),
    taxAmount: Type.Number(),
    discountAmount: Type.Number(),
    serviceChargeAmount: Type.Number(),
    roundingAdjustment: Type.Number(),
    totalAmount: Type.Number(),
    gstNumber: nullableStringSchema,
    payments: Type.Array(billingPaymentSchema),
    itemAssignments: Type.Optional(Type.Array(billItemAssignmentSchema)),
    createdAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const paymentCollectionResultSchema = Type.Object(
  {
    bill: Type.Union([billSchema, Type.Null()]),
    payment: billingPaymentSchema,
    paymentState: Type.Union([
      Type.Literal("PAID"),
      Type.Literal("PARTIALLY_PAID"),
    ]),
  },
  { additionalProperties: false },
);

export const paymentRefundSchema = Type.Object(
  {
    id: uuidSchema,
    paymentId: uuidSchema,
    amount: Type.Number(),
    reason: Type.String(),
    createdAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const seatShareSchema = Type.Object(
  {
    seatLabel: Type.String(),
    shareRatio: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export const seatSplitAllocationSchema = Type.Object(
  {
    label: Type.Optional(Type.String()),
    orderItemIds: Type.Array(uuidSchema),
  },
  { additionalProperties: true },
);

export const seatSplitResultSchema = Type.Union([
  Type.Object(
    {
      status: Type.Literal("CREATED"),
      bills: Type.Array(billSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      status: Type.Literal("MANUAL_REQUIRED"),
      allocations: Type.Array(seatSplitAllocationSchema),
      sharedItemIds: Type.Array(uuidSchema),
    },
    { additionalProperties: false },
  ),
]);

export const razorpayWebhookIngressResultSchema = Type.Object(
  {
    duplicate: Type.Boolean(),
    queued: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const razorpayWebhookIngressResponseSchema = successResponseSchema(
  razorpayWebhookIngressResultSchema,
);

export const paymentCollectionResponseSchema = successResponseSchema(
  paymentCollectionResultSchema,
);
export const paymentRefundResponseSchema =
  successResponseSchema(paymentRefundSchema);
export const billResponseSchema = successResponseSchema(billSchema);
export const billsResponseSchema = successResponseSchema(
  Type.Array(billSchema),
);
export const splitBillsResponseSchema = successResponseSchema(
  Type.Array(billSchema),
);
export const seatSharesResponseSchema = successResponseSchema(
  Type.Array(seatShareSchema),
);
export const seatSplitResponseSchema = successResponseSchema(
  seatSplitResultSchema,
);

export type BillingPaymentResponse = Static<typeof billingPaymentSchema>;
export type BillResponse = Static<typeof billSchema>;
export type PaymentCollectionResultResponse = Static<
  typeof paymentCollectionResultSchema
>;
export type PaymentRefundResponse = Static<typeof paymentRefundSchema>;
export type SeatSplitResultResponse = Static<typeof seatSplitResultSchema>;
