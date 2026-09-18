import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

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

export const realtimeEventPayloadEnvelopeSchema = Type.Object(
  {
    customerSessionId: Type.Optional(uuidSchema),
    customerSession: Type.Optional(
      Type.Object(
        {
          id: Type.Optional(uuidSchema),
        },
        { additionalProperties: true },
      ),
    ),
  },
  { additionalProperties: true },
);

export const realtimeEnvelopeSchema = Type.Object(
  {
    type: realtimeEventTypeSchema,
    tenantId: uuidSchema,
    branchId: Type.Optional(Type.Union([uuidSchema, Type.Null()])),
    timestamp: Type.Optional(Type.String({ format: "date-time" })),
    payload: realtimeEventPayloadEnvelopeSchema,
  },
  { additionalProperties: false },
);

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

export type RealtimeEnvelope = Static<typeof realtimeEnvelopeSchema>;
export type StaffRealtimeAuthMessage = Static<
  typeof staffRealtimeAuthMessageSchema
>;
export type CustomerRealtimeAuthMessage = Static<
  typeof customerRealtimeAuthMessageSchema
>;
