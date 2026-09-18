import { Elysia } from "elysia";
import { requireAuthPlugin } from "@/core/auth";
import { orderController } from "./order.controller";
import {
  compOrderItemBodySchema as compOrderItemBody,
  createOrderBodySchema as createOrderBody,
  fireTicketBodySchema as fireTicketBody,
  mergeOrderBodySchema as mergeOrderBody,
  orderIdParamsSchema as orderIdParams,
  orderItemParamsSchema as orderItemParams,
  orderListQuerySchema as orderListQuery,
  orderCreatedResponseSchema,
  orderExplainResponseSchema,
  orderInventoryImpactResponseSchema,
  orderListResponseSchema,
  orderMergeResponseSchema,
  orderResponseSchema,
  standardErrorResponseSchemas,
  refireOrderItemBodySchema as refireOrderItemBody,
  transferTableBodySchema as transferTableBody,
  updateOrderStatusBodySchema as updateOrderStatusBody,
  voidOrderItemBodySchema as voidOrderItemBody,
} from "@pos/contracts";

export const ordersRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/orders/", ({ auth, query }) => orderController.list(auth, query), {
    query: orderListQuery,
    response: { 200: orderListResponseSchema, ...standardErrorResponseSchemas },
  })
  .get(
    "/api/orders/:id",
    ({ auth, params }) => orderController.getById(auth, params.id),
    {
      params: orderIdParams,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .get(
    "/api/orders/:id/explain",
    ({ auth, params }) => orderController.explain(auth, params.id),
    {
      params: orderIdParams,
      response: {
        200: orderExplainResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/orders/:id/inventory-impact",
    ({ auth, params }) => orderController.getInventoryImpact(auth, params.id),
    {
      params: orderIdParams,
      response: {
        200: orderInventoryImpactResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/orders/",
    ({ auth, body, set }) => {
      set.status = 201;
      return orderController.create(auth, body);
    },
    {
      body: createOrderBody,
      response: {
        201: orderCreatedResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/api/orders/:id/status",
    ({ auth, params, body }) =>
      orderController.updateStatus(
        auth,
        params.id,
        body.status,
        body.reason,
        body.cancellationReasonId,
      ),
    {
      params: orderIdParams,
      body: updateOrderStatusBody,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )

  .post(
    "/api/orders/:id/items",
    ({ auth, params, body }) =>
      orderController.fireTicket(auth, params.id, body),
    {
      params: orderIdParams,
      body: fireTicketBody,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/items/:itemId/void",
    ({ auth, params, body }) =>
      orderController.voidItem(
        auth,
        params.id,
        params.itemId,
        body.reason,
        body.cancellationReasonId,
        body.approvalToken,
      ),
    {
      params: orderItemParams,
      body: voidOrderItemBody,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/items/:itemId/comp",
    ({ auth, params, body }) =>
      orderController.compItem(
        auth,
        params.id,
        params.itemId,
        body.reason,
        body.cancellationReasonId,
        body.approvalToken,
      ),
    {
      params: orderItemParams,
      body: compOrderItemBody,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/items/:itemId/refire",
    ({ auth, params, body }) =>
      orderController.refireItem(
        auth,
        params.id,
        params.itemId,
        body.reason,
        body.alsoCompOriginal,
      ),
    {
      params: orderItemParams,
      body: refireOrderItemBody,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/items/:itemId/refill",
    ({ auth, params }) =>
      orderController.refillItem(auth, params.id, params.itemId),
    {
      params: orderItemParams,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/transfer-table",
    ({ auth, params, body }) =>
      orderController.transferTable(
        auth,
        params.id,
        body.newTableId,
        body.reason,
      ),
    {
      params: orderIdParams,
      body: transferTableBody,
      response: { 200: orderResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/merge",
    ({ auth, params, body }) =>
      orderController.mergeOrders(auth, params.id, body.targetOrderId),
    {
      params: orderIdParams,
      body: mergeOrderBody,
      response: {
        200: orderMergeResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
