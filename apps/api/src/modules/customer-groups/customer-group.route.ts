import { Elysia } from "elysia";
import {
  customerGroupListResponseSchema,
  customerGroupResponseSchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { toCustomerGroupResponse } from "./customer-group.mapper";
import { customerGroupService } from "./customer-group.service";
import {
  createCustomerGroupBody,
  customerGroupIdParams,
  updateCustomerGroupBody,
} from "./customer-group.validator";

export const customerGroupsRouter = new Elysia({
  prefix: "/api/customer-groups",
})
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth }) =>
      successResponse(
        (await customerGroupService.list(auth)).map(toCustomerGroupResponse),
      ),
    {
      response: {
        200: customerGroupListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/:id",
    async ({ auth, params }) =>
      successResponse(
        toCustomerGroupResponse(
          await customerGroupService.findById(auth, params.id),
        ),
      ),
    {
      params: customerGroupIdParams,
      response: {
        200: customerGroupResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    async ({ auth, body, set }) => {
      set.status = 201;
      return createdResponse(
        toCustomerGroupResponse(await customerGroupService.create(auth, body)),
      );
    },
    {
      body: createCustomerGroupBody,
      response: {
        201: customerGroupResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toCustomerGroupResponse(
          await customerGroupService.update(auth, params.id, body),
        ),
      ),
    {
      params: customerGroupIdParams,
      body: updateCustomerGroupBody,
      response: {
        200: customerGroupResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    async ({ auth, params }) => {
      await customerGroupService.remove(auth, params.id);
      return successResponse(null);
    },
    {
      params: customerGroupIdParams,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
