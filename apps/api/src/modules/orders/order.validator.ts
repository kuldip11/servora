import { t } from "elysia";

const orderItemInput = t.Object({
  menuItemId: t.String(),
  variantId: t.Optional(t.String()),
  quantity: t.Number({ minimum: 1 }),
  chefNotes: t.Optional(t.String()),
  seatLabel: t.Optional(t.String({ maxLength: 50 })),
  courseNumber: t.Optional(t.Integer({ minimum: 1, maximum: 20 })),
  weightQuantity: t.Optional(t.Number({ exclusiveMinimum: 0 })),
  manualPrice: t.Optional(t.Number({ minimum: 0 })),
  selectedOptions: t.Optional(
    t.Array(
      t.Object({
        optionId: t.String(),
        quantity: t.Optional(t.Number({ minimum: 1 })),
        zoneLabel: t.Optional(t.String({ minLength: 1, maxLength: 30 })),
      }),
    ),
  ),
});

const comboOrderInput = t.Object({
  comboId: t.String({ format: "uuid" }),
  quantity: t.Optional(t.Number({ minimum: 1, maximum: 999 })),
  courseNumber: t.Optional(t.Integer({ minimum: 1, maximum: 20 })),
  selections: t.Array(
    t.Object({
      slotId: t.String({ format: "uuid" }),
      optionIds: t.Array(t.String({ format: "uuid" })),
    }),
  ),
});

export const createOrderBody = t.Object({
  type: t.Union([
    t.Literal("DINE_IN"),
    t.Literal("TAKEAWAY"),
    t.Literal("DELIVERY"),
    t.Literal("ONLINE"),
  ]),
  tableId: t.Optional(t.String()),
  customerId: t.Optional(t.String({ format: "uuid" })),
  customerGroupId: t.Optional(t.String({ format: "uuid" })),
  billingMode: t.Optional(
    t.Union([t.Literal("LINE_ITEMS"), t.Literal("PER_COVER")]),
  ),
  coverCount: t.Optional(t.Integer({ minimum: 1, maximum: 999 })),
  perCoverPriceRuleId: t.Optional(t.String({ format: "uuid" })),
  notes: t.Optional(t.String()),
  couponCode: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  promotionIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  items: t.Optional(t.Array(orderItemInput)),
  combos: t.Optional(t.Array(comboOrderInput)),
});

export const updateOrderStatusBody = t.Object({
  status: t.Union([
    t.Literal("OPEN"),
    t.Literal("BILL_REQUESTED"),
    t.Literal("PAID"),
    t.Literal("CLOSED"),
    t.Literal("CANCELLED"),
  ]),
  reason: t.Optional(t.String()),
  cancellationReasonId: t.Optional(t.String({ format: "uuid" })),
});

export const fireTicketBody = t.Object({
  notes: t.Optional(t.String()),
  couponCode: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  promotionIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  items: t.Optional(t.Array(orderItemInput)),
  combos: t.Optional(t.Array(comboOrderInput)),
});

export const orderIdParams = t.Object({
  id: t.String(),
});

export const orderItemParams = t.Object({
  id: t.String(),
  itemId: t.String(),
});

export const transferTableBody = t.Object({
  newTableId: t.String({ format: "uuid" }),
  reason: t.Optional(t.String({ maxLength: 500 })),
});
export const mergeOrderBody = t.Object({
  targetOrderId: t.String({ format: "uuid" }),
});

export const voidOrderItemBody = t.Object({
  reason: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  cancellationReasonId: t.Optional(t.String({ format: "uuid" })),
  approvalToken: t.Optional(t.String({ format: "uuid" })),
});

export const compOrderItemBody = voidOrderItemBody;

export const orderSearchQuery = t.Object({
  q: t.String({ minLength: 8, maxLength: 100 }),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 20 })),
});

export const orderListQuery = t.Object({
  status: t.Optional(t.String()),
  type: t.Optional(t.String()),
  search: t.Optional(t.String({ maxLength: 100 })),
  view: t.Optional(
    t.Union([t.Literal("READY"), t.Literal("ACTIVE"), t.Literal("ALL")]),
  ),
  page: t.Optional(t.Integer({ minimum: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  sortBy: t.Optional(
    t.Union([t.Literal("id"), t.Literal("total"), t.Literal("createdAt")]),
  ),
  sortDirection: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export const refireOrderItemBody = t.Object({
  reason: t.String({ minLength: 1, maxLength: 500 }),
  alsoCompOriginal: t.Optional(t.Boolean()),
});
