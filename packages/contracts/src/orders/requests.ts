import { Type, type Static } from "@sinclair/typebox";
import {
  paginationLimitSchema,
  paginationPageSchema,
} from "../common/pagination";
import { sortDirectionSchema } from "../common/sorting";
import { uuidSchema } from "../common/ids";

export const orderTypeSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
  Type.Literal("DELIVERY"),
  Type.Literal("ONLINE"),
]);

export const orderItemInputSchema = Type.Object(
  {
    menuItemId: uuidSchema,
    variantId: Type.Optional(uuidSchema),
    quantity: Type.Integer({ minimum: 1, maximum: 999 }),
    chefNotes: Type.Optional(Type.String({ maxLength: 200 })),
    seatLabel: Type.Optional(Type.String({ maxLength: 50 })),
    courseNumber: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })),
    weightQuantity: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    manualPrice: Type.Optional(Type.Number({ minimum: 0 })),
    selectedOptions: Type.Optional(
      Type.Array(
        Type.Object(
          {
            optionId: uuidSchema,
            quantity: Type.Optional(Type.Integer({ minimum: 1, maximum: 999 })),
            zoneLabel: Type.Optional(
              Type.String({ minLength: 1, maxLength: 30 }),
            ),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
);

export const comboOrderInputSchema = Type.Object(
  {
    comboId: uuidSchema,
    quantity: Type.Optional(Type.Integer({ minimum: 1, maximum: 999 })),
    courseNumber: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })),
    selections: Type.Array(
      Type.Object(
        {
          slotId: uuidSchema,
          optionIds: Type.Array(uuidSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

const promotionIdsSchema = Type.Optional(Type.Array(uuidSchema));

export const createOrderBodySchema = Type.Object(
  {
    type: orderTypeSchema,
    tableId: Type.Optional(uuidSchema),
    customerId: Type.Optional(uuidSchema),
    customerGroupId: Type.Optional(uuidSchema),
    billingMode: Type.Optional(
      Type.Union([Type.Literal("LINE_ITEMS"), Type.Literal("PER_COVER")]),
    ),
    coverCount: Type.Optional(Type.Integer({ minimum: 1, maximum: 999 })),
    perCoverPriceRuleId: Type.Optional(uuidSchema),
    notes: Type.Optional(Type.String({ maxLength: 500 })),
    couponCode: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    promotionIds: promotionIdsSchema,
    items: Type.Optional(Type.Array(orderItemInputSchema)),
    combos: Type.Optional(Type.Array(comboOrderInputSchema)),
  },
  { additionalProperties: false },
);

export const orderStatusSchema = Type.Union([
  Type.Literal("OPEN"),
  Type.Literal("BILL_REQUESTED"),
  Type.Literal("PAID"),
  Type.Literal("CLOSED"),
  Type.Literal("CANCELLED"),
]);

export const updateOrderStatusBodySchema = Type.Object(
  {
    status: orderStatusSchema,
    reason: Type.Optional(Type.String({ maxLength: 500 })),
    cancellationReasonId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const fireTicketBodySchema = Type.Object(
  {
    notes: Type.Optional(Type.String({ maxLength: 500 })),
    couponCode: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    promotionIds: promotionIdsSchema,
    items: Type.Optional(Type.Array(orderItemInputSchema)),
    combos: Type.Optional(Type.Array(comboOrderInputSchema)),
  },
  { additionalProperties: false },
);

export const orderIdParamsSchema = Type.Object({ id: uuidSchema });
export const orderItemParamsSchema = Type.Object({
  id: uuidSchema,
  itemId: uuidSchema,
});

export const transferTableBodySchema = Type.Object(
  {
    newTableId: uuidSchema,
    reason: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false },
);

export const mergeOrderBodySchema = Type.Object(
  { targetOrderId: uuidSchema },
  { additionalProperties: false },
);

export const voidOrderItemBodySchema = Type.Object(
  {
    reason: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
    cancellationReasonId: Type.Optional(uuidSchema),
    approvalToken: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);
export const compOrderItemBodySchema = voidOrderItemBodySchema;

export const orderListQuerySchema = Type.Object(
  {
    status: Type.Optional(Type.String()),
    type: Type.Optional(Type.String()),
    search: Type.Optional(Type.String({ maxLength: 100 })),
    view: Type.Optional(
      Type.Union([
        Type.Literal("READY"),
        Type.Literal("ACTIVE"),
        Type.Literal("ALL"),
      ]),
    ),
    page: Type.Optional(paginationPageSchema),
    limit: Type.Optional(paginationLimitSchema),
    sortBy: Type.Optional(
      Type.Union([
        Type.Literal("id"),
        Type.Literal("total"),
        Type.Literal("createdAt"),
      ]),
    ),
    sortDirection: Type.Optional(sortDirectionSchema),
  },
  { additionalProperties: false },
);

export const refireOrderItemBodySchema = Type.Object(
  {
    reason: Type.String({ minLength: 1, maxLength: 500 }),
    alsoCompOriginal: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export type OrderItemRequest = Static<typeof orderItemInputSchema>;
export type ComboOrderRequest = Static<typeof comboOrderInputSchema>;
export type CreateOrderRequest = Static<typeof createOrderBodySchema>;
export type FireTicketRequest = Static<typeof fireTicketBodySchema>;
export type OrderListQuery = Static<typeof orderListQuerySchema>;
export type UpdateOrderStatusRequest = Static<
  typeof updateOrderStatusBodySchema
>;
export type TransferTableRequest = Static<typeof transferTableBodySchema>;
export type MergeOrderRequest = Static<typeof mergeOrderBodySchema>;
export type VoidOrderItemRequest = Static<typeof voidOrderItemBodySchema>;
export type RefireOrderItemRequest = Static<typeof refireOrderItemBodySchema>;
