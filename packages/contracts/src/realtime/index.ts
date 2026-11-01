import {
  FormatRegistry,
  Type,
  type Static,
  type TObject,
} from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { customerRequestSchema } from "../customer/responses";
import { inventoryItemSchema } from "../inventory/responses";
import { kitchenQueueTicketSchema } from "../kitchen/responses";
import { orderSchema } from "../orders/responses";
import { tableSchema } from "../tables/responses";

if (!FormatRegistry.Has("date-time")) {
  FormatRegistry.Set("date-time", (value) => !Number.isNaN(Date.parse(value)));
}

export const realtimeEventTypeSchema = Type.Union([
  Type.Literal("order.created"),
  Type.Literal("order.updated"),
  Type.Literal("order.item.voided"),
  Type.Literal("kitchen.ticket.created"),
  Type.Literal("kitchen.ticket.updated"),
  Type.Literal("inventory.low_stock"),
  Type.Literal("menu.availability.updated"),
  Type.Literal("payment.updated"),
  Type.Literal("table.updated"),
  Type.Literal("customer.request.created"),
  Type.Literal("customer.request.updated"),
]);

export const realtimeOrderPayloadSchema = Type.Object(
  {
    ...orderSchema.properties,
    customerSessionId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const realtimeKitchenTicketPayloadSchema = Type.Object(
  {
    ...kitchenQueueTicketSchema.properties,
    customerSessionId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const realtimeAvailabilityPayloadSchema = Type.Object(
  {
    source: Type.Union([
      Type.Literal("INVENTORY"),
      Type.Literal("MANUAL_STOCK_COUNT"),
    ]),
    entityType: Type.Union([
      Type.Literal("ITEM"),
      Type.Literal("VARIANT"),
      Type.Literal("MODIFIER_OPTION"),
    ]),
    entityId: uuidSchema,
    menuItemId: uuidSchema,
    computedStatus: Type.Optional(
      Type.Union([Type.Literal("ACTIVE"), Type.Literal("OUT_OF_STOCK")]),
    ),
    effectiveStatus: Type.Optional(Type.String()),
    computedAvailability: Type.Optional(Type.Boolean()),
    effectiveAvailability: Type.Optional(Type.Boolean()),
    manualStockCount: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
    reason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);

export const realtimePaymentPayloadSchema = Type.Object(
  {
    paymentId: uuidSchema,
    orderId: uuidSchema,
    status: Type.Union([
      Type.Literal("PENDING"),
      Type.Literal("SUCCESS"),
      Type.Literal("FAILED"),
      Type.Literal("REFUNDED"),
    ]),
    amount: Type.Number(),
  },
  { additionalProperties: false },
);

const eventSchema = <T extends string, P extends TObject>(
  type: T,
  payload: P,
) =>
  Type.Object(
    { type: Type.Literal(type), payload },
    { additionalProperties: false },
  );

const envelopeSchema = <T extends string, P extends TObject>(
  type: T,
  payload: P,
) =>
  Type.Object(
    {
      type: Type.Literal(type),
      tenantId: uuidSchema,
      branchId: Type.Optional(Type.Union([uuidSchema, Type.Null()])),
      timestamp: isoDateTimeSchema,
      payload,
    },
    { additionalProperties: false },
  );

export const realtimeEventSchema = Type.Union([
  eventSchema("order.created", realtimeOrderPayloadSchema),
  eventSchema("order.updated", realtimeOrderPayloadSchema),
  eventSchema("order.item.voided", realtimeKitchenTicketPayloadSchema),
  eventSchema("kitchen.ticket.created", realtimeKitchenTicketPayloadSchema),
  eventSchema("kitchen.ticket.updated", realtimeKitchenTicketPayloadSchema),
  eventSchema("inventory.low_stock", inventoryItemSchema),
  eventSchema("menu.availability.updated", realtimeAvailabilityPayloadSchema),
  eventSchema("payment.updated", realtimePaymentPayloadSchema),
  eventSchema("table.updated", tableSchema),
  eventSchema("customer.request.created", customerRequestSchema),
  eventSchema("customer.request.updated", customerRequestSchema),
]);

export const realtimeEnvelopeSchema = Type.Union([
  envelopeSchema("order.created", realtimeOrderPayloadSchema),
  envelopeSchema("order.updated", realtimeOrderPayloadSchema),
  envelopeSchema("order.item.voided", realtimeKitchenTicketPayloadSchema),
  envelopeSchema("kitchen.ticket.created", realtimeKitchenTicketPayloadSchema),
  envelopeSchema("kitchen.ticket.updated", realtimeKitchenTicketPayloadSchema),
  envelopeSchema("inventory.low_stock", inventoryItemSchema),
  envelopeSchema(
    "menu.availability.updated",
    realtimeAvailabilityPayloadSchema,
  ),
  envelopeSchema("payment.updated", realtimePaymentPayloadSchema),
  envelopeSchema("table.updated", tableSchema),
  envelopeSchema("customer.request.created", customerRequestSchema),
  envelopeSchema("customer.request.updated", customerRequestSchema),
]);

export const staffRealtimeAuthMessageSchema = Type.Object(
  {
    type: Type.Literal("auth"),
    token: Type.String({ minLength: 1, maxLength: 8192 }),
    tenantId: uuidSchema,
    branchId: Type.Optional(Type.Union([uuidSchema, Type.Literal("all")])),
  },
  { additionalProperties: false },
);

export const customerRealtimeAuthMessageSchema = Type.Object(
  {
    type: Type.Literal("auth"),
    session: Type.String({ minLength: 1, maxLength: 4096 }),
  },
  { additionalProperties: false },
);

export const realtimeErrorMessageSchema = Type.Object(
  {
    type: Type.Literal("error"),
    code: Type.Union([
      Type.Literal("AUTH_TIMEOUT"),
      Type.Literal("AUTH_REQUIRED"),
      Type.Literal("AUTH_INVALID_TOKEN"),
      Type.Literal("CUSTOMER_SESSION_INVALID"),
    ]),
  },
  { additionalProperties: false },
);

export const staffRealtimeConnectedMessageSchema = Type.Object(
  {
    type: Type.Literal("connected"),
    tenantId: uuidSchema,
  },
  { additionalProperties: false },
);

export const customerRealtimeConnectedMessageSchema = Type.Object(
  {
    type: Type.Literal("connected"),
    sessionId: uuidSchema,
  },
  { additionalProperties: false },
);

export type RealtimeEvent = Static<typeof realtimeEventSchema>;
export type RealtimeEnvelope = Static<typeof realtimeEnvelopeSchema>;
export type RealtimeOrderPayload = Static<typeof realtimeOrderPayloadSchema>;
export type RealtimeKitchenTicketPayload = Static<
  typeof realtimeKitchenTicketPayloadSchema
>;
export type RealtimeAvailabilityPayload = Static<
  typeof realtimeAvailabilityPayloadSchema
>;
export type RealtimePaymentPayload = Static<
  typeof realtimePaymentPayloadSchema
>;
export type StaffRealtimeAuthMessage = Static<
  typeof staffRealtimeAuthMessageSchema
>;
export type CustomerRealtimeAuthMessage = Static<
  typeof customerRealtimeAuthMessageSchema
>;
export type StaffRealtimeConnectedMessage = Static<
  typeof staffRealtimeConnectedMessageSchema
>;
export type CustomerRealtimeConnectedMessage = Static<
  typeof customerRealtimeConnectedMessageSchema
>;

export const isRealtimeEnvelope = (value: unknown): value is RealtimeEnvelope =>
  Value.Check(realtimeEnvelopeSchema, value);

export const isCustomerRealtimeConnectedMessage = (
  value: unknown,
): value is CustomerRealtimeConnectedMessage =>
  Value.Check(customerRealtimeConnectedMessageSchema, value);
