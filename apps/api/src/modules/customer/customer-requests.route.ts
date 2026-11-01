import { Elysia } from "elysia";
import {
  createCustomerRequestBodySchema,
  customerRequestIdParamsSchema,
  customerRequestListResponseSchema,
  customerRequestResponseSchema,
  standardErrorResponseSchemas,
  updateCustomerRequestBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { customerRequestService } from "./customer-requests";
import { CustomerSessionRequiredError } from "@/core/errors";
import { createdResponse, successResponse } from "@/core/response";
import { toCustomerRequestResponse } from "./customer-request.mapper";

export const customerRequestRouter = new Elysia()
  .post(
    "/api/customer/requests",
    async ({ headers, body, set }) => {
      const token = headers["x-customer-session"];
      if (!token) throw new CustomerSessionRequiredError();
      set.status = 201;
      return createdResponse(
        toCustomerRequestResponse(
          await customerRequestService.create(token, body),
        ),
      );
    },
    {
      body: createCustomerRequestBodySchema,
      response: {
        201: customerRequestResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .use(requireAuthPlugin())
  .get(
    "/api/customer/requests",
    async ({ auth }) =>
      successResponse(
        (await customerRequestService.listForStaff(auth)).map(
          toCustomerRequestResponse,
        ),
      ),
    {
      response: {
        200: customerRequestListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/api/customer/requests/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toCustomerRequestResponse(
          await customerRequestService.updateForStaff(
            auth,
            params.id,
            body.status,
          ),
        ),
      ),
    {
      params: customerRequestIdParamsSchema,
      body: updateCustomerRequestBodySchema,
      response: {
        200: customerRequestResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
