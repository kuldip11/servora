import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import {
  paginatedResponseSchema,
  successResponseSchema,
} from "../common/responses";
import { orderStatusSchema, orderTypeSchema } from "./requests";

const nullableUuidSchema = Type.Union([uuidSchema, Type.Null()]);
const nullableStringSchema = Type.Union([Type.String(), Type.Null()]);
const nullableDateTimeSchema = Type.Union([isoDateTimeSchema, Type.Null()]);
const jsonObjectSchema = Type.Record(Type.String(), Type.Unknown());

export const orderItemFulfillmentTypeSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
]);

export const orderItemStatusSchema = Type.Union([
  Type.Literal("ACTIVE"),
  Type.Literal("VOIDED"),
  Type.Literal("COMPED"),
  Type.Literal("REFIRED"),
]);

export const kitchenTicketStatusSchema = Type.Union([
  Type.Literal("PENDING_PAYMENT"),
  Type.Literal("FIRED"),
  Type.Literal("PREPARING"),
  Type.Literal("READY"),
  Type.Literal("SERVED"),
  Type.Literal("HELD"),
]);

export const orderTableSummarySchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    name: Type.String(),
    capacity: Type.Integer({ minimum: 1 }),
    status: Type.Union([
      Type.Literal("AVAILABLE"),
      Type.Literal("OCCUPIED"),
      Type.Literal("CLEANING"),
      Type.Literal("RESERVED"),
    ]),
    section: nullableStringSchema,
  },
  { additionalProperties: false },
);

export const orderItemModifierSchema = Type.Object(
  {
    modifierId: nullableUuidSchema,
    modifierGroupName: nullableStringSchema,
    name: Type.String(),
    price: Type.Number(),
    quantity: Type.Integer({ minimum: 1 }),
    zoneLabel: nullableStringSchema,
  },
  { additionalProperties: false },
);

export const orderItemSeatShareSchema = Type.Object(
  {
    id: uuidSchema,
    seatLabel: Type.String(),
    shareRatio: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export const orderAvailabilitySnapshotSchema = Type.Object(
  {
    asOf: isoDateTimeSchema,
    branchId: uuidSchema,
    channel: Type.Union([
      Type.Literal("UNSCOPED"),
      Type.Literal("STAFF"),
      Type.Literal("CUSTOMER_QR"),
    ]),
    fulfillmentType: Type.Union([
      Type.Literal("UNSCOPED"),
      Type.Literal("DINE_IN"),
      Type.Literal("TAKEAWAY"),
      Type.Literal("DELIVERY"),
      Type.Literal("ONLINE"),
    ]),
    effectiveStatus: Type.String(),
    isHidden: Type.Boolean(),
    reason: nullableStringSchema,
    cause: Type.String(),
  },
  { additionalProperties: false },
);

export const orderItemSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    menuItemId: nullableUuidSchema,
    menuItemName: Type.String(),
    variantId: nullableUuidSchema,
    variantName: nullableStringSchema,
    quantity: Type.Integer({ minimum: 1 }),
    weightQuantity: Type.Union([Type.Number(), Type.Null()]),
    weightUnit: Type.Union([
      Type.Literal("G"),
      Type.Literal("KG"),
      Type.Literal("LB"),
      Type.Literal("OZ"),
      Type.Null(),
    ]),
    manualPrice: Type.Union([Type.Number(), Type.Null()]),
    billingExcluded: Type.Boolean(),
    unitPrice: Type.Number(),
    subtotal: Type.Number(),
    taxRate: Type.Number(),
    taxMode: Type.Union([Type.Literal("INCLUSIVE"), Type.Literal("EXCLUSIVE")]),
    pricingAttribution: Type.Union([jsonObjectSchema, Type.Null()]),
    comboId: nullableUuidSchema,
    comboGroupId: nullableUuidSchema,
    comboSlotOptionId: nullableUuidSchema,
    comboSlotOption: Type.Union([
      Type.Object(
        { id: uuidSchema, isUnlimitedRefill: Type.Boolean() },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
    chefNotes: nullableStringSchema,
    seatLabel: nullableStringSchema,
    fulfillmentType: orderItemFulfillmentTypeSchema,
    stationId: nullableUuidSchema,
    menuChangeEventId: nullableUuidSchema,
    resolutionAsOf: nullableDateTimeSchema,
    availabilitySnapshot: Type.Union([
      orderAvailabilitySnapshotSchema,
      Type.Null(),
    ]),
    itemStatus: orderItemStatusSchema,
    refiresOrderItemId: nullableUuidSchema,
    refireReason: nullableStringSchema,
    refireType: Type.Union([
      Type.Literal("REFIRE"),
      Type.Literal("REFILL"),
      Type.Null(),
    ]),
    refiredBy: nullableUuidSchema,
    refiredAt: nullableDateTimeSchema,
    voidedReason: nullableStringSchema,
    voidedBy: nullableUuidSchema,
    voidedAt: nullableDateTimeSchema,
    voidedReasonId: nullableUuidSchema,
    compedReason: nullableStringSchema,
    compedBy: nullableUuidSchema,
    compedAt: nullableDateTimeSchema,
    compedReasonId: nullableUuidSchema,
    station: Type.Union([
      Type.Object(
        { id: uuidSchema, name: Type.String() },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
    modifiers: Type.Array(orderItemModifierSchema),
    seatShares: Type.Array(orderItemSeatShareSchema),
    createdAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const orderCourseSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    courseNumber: Type.Integer({ minimum: 1 }),
    name: nullableStringSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const kitchenTicketSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    orderId: uuidSchema,
    ticketNumber: Type.Integer({ minimum: 1 }),
    status: kitchenTicketStatusSchema,
    courseId: nullableUuidSchema,
    course: Type.Union([orderCourseSchema, Type.Null()]),
    notes: nullableStringSchema,
    items: Type.Array(orderItemSchema),
    firedAt: nullableDateTimeSchema,
    readyAt: nullableDateTimeSchema,
    servedAt: nullableDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const cancellationReasonSummarySchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    label: Type.String(),
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const orderStatusHistorySchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    oldStatus: Type.Union([orderStatusSchema, Type.Null()]),
    newStatus: orderStatusSchema,
    changedBy: nullableUuidSchema,
    reason: nullableStringSchema,
    cancellationReasonId: nullableUuidSchema,
    cancellationReason: Type.Union([
      cancellationReasonSummarySchema,
      Type.Null(),
    ]),
    changedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const orderPaymentSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    billId: nullableUuidSchema,
    method: Type.Union([
      Type.Literal("CASH"),
      Type.Literal("CARD"),
      Type.Literal("UPI"),
      Type.Literal("RAZORPAY"),
      Type.Literal("STRIPE"),
    ]),
    status: Type.Union([
      Type.Literal("PENDING"),
      Type.Literal("SUCCESS"),
      Type.Literal("FAILED"),
      Type.Literal("REFUNDED"),
    ]),
    amount: Type.Number(),
    reference: nullableStringSchema,
    metadata: jsonObjectSchema,
    createdAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const orderSchema = Type.Object(
  {
    id: uuidSchema,
    mergedIntoOrderId: nullableUuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    tableId: nullableUuidSchema,
    table: Type.Union([orderTableSummarySchema, Type.Null()]),
    customerId: nullableUuidSchema,
    customerGroupId: nullableUuidSchema,
    status: orderStatusSchema,
    type: orderTypeSchema,
    billingMode: Type.Union([
      Type.Literal("LINE_ITEMS"),
      Type.Literal("PER_COVER"),
    ]),
    coverCount: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    perCoverPriceRuleId: nullableUuidSchema,
    perCoverRate: Type.Union([Type.Number(), Type.Null()]),
    subtotal: Type.Number(),
    taxAmount: Type.Number(),
    discountAmount: Type.Number(),
    serviceChargeAmount: Type.Number(),
    roundingAdjustment: Type.Number(),
    totalAmount: Type.Number(),
    notes: nullableStringSchema,
    resolutionAsOf: nullableDateTimeSchema,
    items: Type.Array(orderItemSchema),
    kitchenTickets: Type.Array(kitchenTicketSchema),
    statusHistory: Type.Array(orderStatusHistorySchema),
    payments: Type.Array(orderPaymentSchema),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const orderResponseSchema = successResponseSchema(orderSchema);
export const orderCreatedResponseSchema = successResponseSchema(orderSchema);
export const orderListItemSchema = Type.Object(
  {
    id: uuidSchema,
    mergedIntoOrderId: nullableUuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    tableId: nullableUuidSchema,
    table: Type.Union([orderTableSummarySchema, Type.Null()]),
    customerId: nullableUuidSchema,
    customerGroupId: nullableUuidSchema,
    status: orderStatusSchema,
    type: orderTypeSchema,
    billingMode: Type.Union([
      Type.Literal("LINE_ITEMS"),
      Type.Literal("PER_COVER"),
    ]),
    coverCount: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    perCoverPriceRuleId: nullableUuidSchema,
    perCoverRate: Type.Union([Type.Number(), Type.Null()]),
    subtotal: Type.Number(),
    taxAmount: Type.Number(),
    discountAmount: Type.Number(),
    serviceChargeAmount: Type.Number(),
    roundingAdjustment: Type.Number(),
    totalAmount: Type.Number(),
    notes: nullableStringSchema,
    resolutionAsOf: nullableDateTimeSchema,
    items: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          orderId: uuidSchema,
          menuItemId: nullableUuidSchema,
          menuItemName: Type.String(),
          variantId: nullableUuidSchema,
          variantName: nullableStringSchema,
          quantity: Type.Integer({ minimum: 1 }),
          billingExcluded: Type.Boolean(),
          unitPrice: Type.Number(),
          subtotal: Type.Number(),
          taxRate: Type.Number(),
          taxMode: Type.Union([
            Type.Literal("INCLUSIVE"),
            Type.Literal("EXCLUSIVE"),
          ]),
          chefNotes: nullableStringSchema,
          seatLabel: nullableStringSchema,
          fulfillmentType: orderItemFulfillmentTypeSchema,
          stationId: nullableUuidSchema,
          itemStatus: orderItemStatusSchema,
          comboId: nullableUuidSchema,
          comboGroupId: nullableUuidSchema,
          comboSlotOptionId: nullableUuidSchema,
          createdAt: isoDateTimeSchema,
        },
        { additionalProperties: false },
      ),
    ),
    kitchenTickets: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          status: kitchenTicketStatusSchema,
          ticketNumber: Type.Integer({ minimum: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
    payments: Type.Array(orderPaymentSchema),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const orderListResponseSchema =
  paginatedResponseSchema(orderListItemSchema);

export const orderMergeResultSchema = Type.Object(
  {
    source: orderSchema,
    target: orderSchema,
  },
  { additionalProperties: false },
);
export const orderMergeResponseSchema = successResponseSchema(
  orderMergeResultSchema,
);

export const inventoryImpactItemSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    kitchenTicketId: nullableUuidSchema,
    orderItemId: nullableUuidSchema,
    menuItemId: uuidSchema,
    inventoryItemId: uuidSchema,
    quantityDeducted: Type.Number(),
    unit: Type.String(),
    wasShort: Type.Boolean(),
    deductedAt: isoDateTimeSchema,
    reversedAt: nullableDateTimeSchema,
    inventoryItem: Type.Object(
      {
        id: uuidSchema,
        name: Type.String(),
      },
      { additionalProperties: true },
    ),
    menuItem: Type.Object(
      { id: uuidSchema, name: Type.String() },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
export const orderInventoryImpactResponseSchema = successResponseSchema(
  Type.Array(inventoryImpactItemSchema),
);

// Explainability contains intentionally extensible evidence/trace objects. The outer
// contract is strict while replay payloads remain forward-compatible JSON records.
export const orderExplainLineSchema = Type.Object(
  {
    orderItemId: uuidSchema,
    menuItemId: Type.Optional(uuidSchema),
    name: Type.String(),
    asOf: isoDateTimeSchema,
    historicalEvidenceComplete: Type.Boolean(),
    snapshotPrice: Type.Number(),
    snapshotTaxRate: Type.Optional(Type.Number()),
    pricingAttribution: Type.Optional(jsonObjectSchema),
    pricingReplay: jsonObjectSchema,
    authoritativePricingReplay: Type.Optional(
      Type.Union([jsonObjectSchema, Type.Null()]),
    ),
    availabilityAtOrder: Type.Optional(
      Type.Union([orderAvailabilitySnapshotSchema, Type.Null()]),
    ),
    authoritativeAvailabilityReplay: Type.Optional(
      Type.Union([jsonObjectSchema, Type.Null()]),
    ),
    trace: Type.Array(jsonObjectSchema),
  },
  { additionalProperties: false },
);
export const orderExplainSchema = Type.Object(
  {
    orderId: uuidSchema,
    asOf: isoDateTimeSchema,
    completeHistory: Type.Boolean(),
    historyNotice: Type.String(),
    totals: Type.Object(
      {
        subtotal: Type.Number(),
        discountAmount: Type.Number(),
        taxAmount: Type.Number(),
        serviceChargeAmount: Type.Number(),
        roundingAdjustment: Type.Number(),
        totalAmount: Type.Number(),
      },
      { additionalProperties: false },
    ),
    lines: Type.Array(orderExplainLineSchema),
  },
  { additionalProperties: false },
);
export const orderExplainResponseSchema =
  successResponseSchema(orderExplainSchema);

export type OrderResponse = Static<typeof orderSchema>;
export type OrderListItemResponse = Static<typeof orderListItemSchema>;
export type OrderMergeResponse = Static<typeof orderMergeResultSchema>;
export type OrderInventoryImpactResponse = Static<
  typeof inventoryImpactItemSchema
>;
export type OrderExplainResponse = Static<typeof orderExplainSchema>;
