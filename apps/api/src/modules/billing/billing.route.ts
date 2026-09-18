import { Elysia } from "elysia";
import {
  billResponseSchema,
  billsResponseSchema,
  paymentCollectionResponseSchema,
  paymentRefundResponseSchema,
  seatSharesResponseSchema,
  seatSplitResponseSchema,
  splitBillsResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { billingController } from "./billing.controller";
import {
  createPaymentBody,
  createRefundBody,
  billIdParams,
  orderIdParams,
  splitBillBody,
  splitByItemsBody,
  splitBySeatBody,
  orderItemSeatShareParams,
  itemSeatSharesBody,
} from "./billing.validator";

export const billingRouter = new Elysia()
  .use(requireAuthPlugin())
  .post(
    "/api/payments",
    ({ auth, body, set }) => {
      set.status = 201;
      return billingController.createPayment(auth, body);
    },
    {
      body: createPaymentBody,
      response: {
        201: paymentCollectionResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/refunds",
    ({ auth, body, set }) => {
      set.status = 201;
      return billingController.createRefund(auth, body);
    },
    {
      body: createRefundBody,
      response: {
        201: paymentRefundResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/bills/:id",
    ({ auth, params }) => billingController.getBill(auth, params.id),
    {
      params: billIdParams,
      response: { 200: billResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .get(
    "/api/orders/:id/bills",
    ({ auth, params }) => billingController.getOrderBills(auth, params.id),
    {
      params: orderIdParams,
      response: { 200: billsResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/orders/:id/bills/split",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return billingController.splitOrder(auth, params.id, body.ways);
    },
    {
      params: orderIdParams,
      body: splitBillBody,
      response: {
        201: splitBillsResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/orders/:id/bills/split-items",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return billingController.splitOrderByItems(
        auth,
        params.id,
        body.allocations,
      );
    },
    {
      params: orderIdParams,
      body: splitByItemsBody,
      response: {
        201: splitBillsResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/api/orders/:id/items/:itemId/seat-shares",
    ({ auth, params, body }) =>
      billingController.setItemSeatShares(
        auth,
        params.id,
        params.itemId,
        body.shares,
      ),
    {
      params: orderItemSeatShareParams,
      body: itemSeatSharesBody,
      response: {
        200: seatSharesResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/orders/:id/bills/split-seat",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return billingController.splitOrderBySeat(
        auth,
        params.id,
        body.sharedItemStrategy,
      );
    },
    {
      params: orderIdParams,
      body: splitBySeatBody,
      response: {
        201: seatSplitResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
