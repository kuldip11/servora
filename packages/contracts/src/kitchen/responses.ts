import { Type, type Static } from "@sinclair/typebox";
import { successResponseSchema, uuidSchema } from "../common";

export const kitchenStationSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    name: Type.String({ minLength: 1, maxLength: 100 }),
    printerIdentifier: Type.Union([
      Type.String({ maxLength: 200 }),
      Type.Null(),
    ]),
    sortOrder: Type.Integer(),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);
export const kitchenStationResponseSchema =
  successResponseSchema(kitchenStationSchema);
export const kitchenStationListResponseSchema = successResponseSchema(
  Type.Array(kitchenStationSchema),
);

export const kitchenItemRouteSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    stationId: uuidSchema,
    modifierOptionId: Type.Union([uuidSchema, Type.Null()]),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);
export const kitchenItemRouteResponseSchema = successResponseSchema(
  kitchenItemRouteSchema,
);
export const kitchenItemRouteListResponseSchema = successResponseSchema(
  Type.Array(kitchenItemRouteSchema),
);
export const kitchenNullableItemRouteResponseSchema = successResponseSchema(
  Type.Union([kitchenItemRouteSchema, Type.Null()]),
);

export type KitchenStationResponse = Static<typeof kitchenStationSchema>;
export type KitchenItemRouteResponse = Static<typeof kitchenItemRouteSchema>;

const nullableUuid = Type.Union([uuidSchema, Type.Null()]);
const nullableString = Type.Union([Type.String(), Type.Null()]);
const nullableDateTime = Type.Union([
  Type.String({ format: "date-time" }),
  Type.Null(),
]);

export const kitchenTicketItemModifierSchema = Type.Object(
  {
    modifierId: nullableUuid,
    modifierGroupName: nullableString,
    name: Type.String(),
    price: Type.Number(),
    quantity: Type.Integer({ minimum: 1 }),
    zoneLabel: nullableString,
  },
  { additionalProperties: false },
);

export const kitchenTicketItemSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    menuItemId: nullableUuid,
    menuItemName: Type.String(),
    variantId: nullableUuid,
    variantName: nullableString,
    quantity: Type.Integer({ minimum: 1 }),
    weightQuantity: Type.Union([Type.Number(), Type.Null()]),
    weightUnit: Type.Union([
      Type.Literal("G"),
      Type.Literal("KG"),
      Type.Literal("LB"),
      Type.Literal("OZ"),
      Type.Null(),
    ]),
    comboGroupId: nullableUuid,
    chefNotes: nullableString,
    fulfillmentType: Type.Union([
      Type.Literal("DINE_IN"),
      Type.Literal("TAKEAWAY"),
    ]),
    stationId: nullableUuid,
    itemStatus: Type.Union([
      Type.Literal("ACTIVE"),
      Type.Literal("VOIDED"),
      Type.Literal("COMPED"),
      Type.Literal("REFIRED"),
    ]),
    refiresOrderItemId: nullableUuid,
    refireReason: nullableString,
    refireType: Type.Union([
      Type.Literal("REFIRE"),
      Type.Literal("REFILL"),
      Type.Null(),
    ]),
    modifiers: Type.Array(kitchenTicketItemModifierSchema),
  },
  { additionalProperties: false },
);

export const kitchenTicketCourseSchema = Type.Object(
  {
    id: uuidSchema,
    orderId: uuidSchema,
    courseNumber: Type.Integer({ minimum: 1 }),
    name: nullableString,
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export const kitchenTicketOrderSummarySchema = Type.Object(
  {
    id: uuidSchema,
    type: Type.Union([
      Type.Literal("DINE_IN"),
      Type.Literal("TAKEAWAY"),
      Type.Literal("DELIVERY"),
      Type.Literal("ONLINE"),
    ]),
    tableId: nullableUuid,
    table: Type.Union([
      Type.Object(
        {
          id: uuidSchema,
          name: Type.String(),
          section: nullableString,
        },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);

export const kitchenQueueTicketSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    orderId: uuidSchema,
    order: Type.Optional(kitchenTicketOrderSummarySchema),
    ticketNumber: Type.Integer({ minimum: 1 }),
    status: Type.Union([
      Type.Literal("PENDING_PAYMENT"),
      Type.Literal("FIRED"),
      Type.Literal("PREPARING"),
      Type.Literal("READY"),
      Type.Literal("SERVED"),
      Type.Literal("HELD"),
    ]),
    courseId: nullableUuid,
    course: Type.Union([kitchenTicketCourseSchema, Type.Null()]),
    notes: nullableString,
    items: Type.Array(kitchenTicketItemSchema),
    firedAt: nullableDateTime,
    readyAt: nullableDateTime,
    servedAt: nullableDateTime,
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export const kitchenQueueTicketResponseSchema = successResponseSchema(
  kitchenQueueTicketSchema,
);
export const kitchenQueueTicketListResponseSchema = successResponseSchema(
  Type.Array(kitchenQueueTicketSchema),
);
export type KitchenQueueTicketResponse = Static<
  typeof kitchenQueueTicketSchema
>;
