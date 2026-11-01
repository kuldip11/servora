import { Elysia } from "elysia";
import {
  cancellationReasonIdParamsSchema,
  cancellationReasonListQuerySchema,
  cancellationReasonListResponseSchema,
  cancellationReasonResponseSchema,
  createCancellationReasonBodySchema,
  standardErrorResponseSchemas,
  updateCancellationReasonBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { toCancellationReasonResponse } from "./cancellation-reason.mapper";
import { cancellationReasonService } from "./cancellation-reason.service";

export const cancellationReasonsRouter = new Elysia({
  prefix: "/api/orders/cancellation-reasons",
})
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth, query }) =>
      successResponse(
        (
          await cancellationReasonService.list(
            auth,
            query.activeOnly === "true",
          )
        ).map(toCancellationReasonResponse),
      ),
    {
      query: cancellationReasonListQuerySchema,
      response: {
        200: cancellationReasonListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    async ({ auth, body, set }) => {
      set.status = 201;
      return createdResponse(
        toCancellationReasonResponse(
          await cancellationReasonService.create(auth, body.label),
        ),
      );
    },
    {
      body: createCancellationReasonBodySchema,
      response: {
        201: cancellationReasonResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toCancellationReasonResponse(
          await cancellationReasonService.update(auth, params.id, body),
        ),
      ),
    {
      params: cancellationReasonIdParamsSchema,
      body: updateCancellationReasonBodySchema,
      response: {
        200: cancellationReasonResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
