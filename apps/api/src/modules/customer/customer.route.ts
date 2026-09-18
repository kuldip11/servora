import { Elysia } from "elysia";
import { customerController } from "./customer.controller";
import {
  createCustomerOrderBody,
  createSessionBody,
  customerCheckoutBody,
  customerOrderIdParams,
  takeawayPaymentVerificationBody,
} from "./customer.validator";
import { CustomerSessionRequiredError } from "@/core/errors";
import {
  customerCheckoutResponseSchema,
  customerMenuResponseSchema,
  customerOrderResponseSchema,
  customerSessionResponseSchema,
  customerTakeawayPaymentResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";

const sessionToken = (headers: Record<string, string | undefined>) =>
  headers["x-customer-session"];

export const customerRouter = new Elysia({ prefix: "/api/customer" })
  .post(
    "/sessions",
    ({ body, set }) => {
      set.status = 201;
      return customerController.createSession(body.qrToken);
    },
    {
      body: createSessionBody,
      response: {
        201: customerSessionResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/menu",
    ({ headers }) => {
      const token = sessionToken(headers);
      if (!token) {
        throw new CustomerSessionRequiredError();
      }
      return customerController.getMenu(token);
    },
    {
      response: {
        200: customerMenuResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/orders",
    ({ headers, body, set }) => {
      const token = sessionToken(headers);
      if (!token) throw new CustomerSessionRequiredError();
      set.status = 201;
      return customerController.createOrder(
        token,
        body,
        headers["x-customer-request-id"],
      );
    },
    {
      body: createCustomerOrderBody,
      response: {
        201: customerOrderResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/orders/:id/payment/initiate",
    ({ headers, params, set }) => {
      const token = sessionToken(headers);
      if (!token) throw new CustomerSessionRequiredError();
      set.status = 201;
      return customerController.initiateTakeawayPayment(token, params.id);
    },
    {
      params: customerOrderIdParams,
      response: {
        201: customerTakeawayPaymentResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/orders/:id/payment/verify",
    ({ headers, params, body, set }) => {
      const token = sessionToken(headers);
      if (!token) throw new CustomerSessionRequiredError();
      set.status = 201;
      return customerController.verifyTakeawayPayment(token, params.id, body);
    },
    {
      params: customerOrderIdParams,
      body: takeawayPaymentVerificationBody,
      response: {
        201: customerOrderResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/orders/:id/checkout",
    ({ headers, params, body, set }) => {
      const token = sessionToken(headers);
      if (!token) {
        throw new CustomerSessionRequiredError();
      }
      set.status = 201;
      return customerController.checkout(token, {
        orderId: params.id,
        ...body,
      });
    },
    {
      params: customerOrderIdParams,
      body: customerCheckoutBody,
      response: {
        201: customerCheckoutResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/orders/:id",
    ({ headers, params, set }) => {
      const token = sessionToken(headers);
      if (!token) {
        throw new CustomerSessionRequiredError();
      }
      return customerController.getOrder(token, params.id);
    },
    {
      params: customerOrderIdParams,
      response: {
        200: customerOrderResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
