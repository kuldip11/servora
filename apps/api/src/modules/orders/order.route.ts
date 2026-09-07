import { Elysia } from "elysia";
import { requireAuthPlugin } from "@/core/auth";
import { orderController } from "./order.controller";
import {
  createOrderBody,
  updateOrderStatusBody,
  fireTicketBody,
  orderIdParams,
  orderListQuery,
  orderSearchQuery,
  orderItemParams,
  voidOrderItemBody,
  compOrderItemBody,
  refireOrderItemBody,
  transferTableBody,
  mergeOrderBody,
} from "./order.validator";

export const ordersRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/orders/", ({ auth, query }) => orderController.list(auth, query), {
    query: orderListQuery,
  })
  .get(
    "/api/orders/search",
    ({ auth, query }) => orderController.search(auth, query),
    { query: orderSearchQuery },
  )
  .get(
    "/api/orders/:id",
    ({ auth, params }) => orderController.getById(auth, params.id),
    {
      params: orderIdParams,
    },
  )
  .get(
    "/api/orders/:id/explain",
    ({ auth, params }) => orderController.explain(auth, params.id),
    { params: orderIdParams },
  )
  .get(
    "/api/orders/:id/inventory-impact",
    ({ auth, params }) => orderController.getInventoryImpact(auth, params.id),
    { params: orderIdParams },
  )
  .post(
    "/api/orders/",
    ({ auth, body, set }) => {
      set.status = 201;
      return orderController.create(auth, body);
    },
    { body: createOrderBody },
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
    { params: orderIdParams, body: updateOrderStatusBody },
  )

  .post(
    "/api/orders/:id/items",
    ({ auth, params, body }) =>
      orderController.fireTicket(auth, params.id, body),
    { params: orderIdParams, body: fireTicketBody },
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
    { params: orderItemParams, body: voidOrderItemBody },
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
    { params: orderItemParams, body: compOrderItemBody },
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
    { params: orderItemParams, body: refireOrderItemBody },
  )
  .post(
    "/api/orders/:id/items/:itemId/refill",
    ({ auth, params }) =>
      orderController.refillItem(auth, params.id, params.itemId),
    { params: orderItemParams },
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
    { params: orderIdParams, body: transferTableBody },
  )
  .post(
    "/api/orders/:id/merge",
    ({ auth, params, body }) =>
      orderController.mergeOrders(auth, params.id, body.targetOrderId),
    { params: orderIdParams, body: mergeOrderBody },
  );
