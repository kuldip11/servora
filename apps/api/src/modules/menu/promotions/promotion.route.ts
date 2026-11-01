import { Elysia } from "elysia";
import {
  nullSuccessResponseSchema,
  promotionListResponseSchema,
  promotionPreviewResponseSchema,
  promotionResponseSchema,
  promotionStatsResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { promotionController } from "./promotion.controller";
import {
  createPromotionBody,
  promotionParams,
  promotionPreviewBody,
  updatePromotionBody,
} from "./promotion.validator";
export const promotionsRouter = new Elysia({ prefix: "/api/menu/promotions" })
  .use(requireAuthPlugin())
  .get("/", ({ auth }) => promotionController.list(auth), {
    response: {
      200: promotionListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/preview",
    ({ auth, body }) => promotionController.preview(auth, body),
    {
      body: promotionPreviewBody,
      response: {
        200: promotionPreviewResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return promotionController.create(auth, body);
    },
    {
      body: createPromotionBody,
      response: {
        201: promotionResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    ({ auth, params, body }) =>
      promotionController.update(auth, params.id, body),
    {
      params: promotionParams,
      body: updatePromotionBody,
      response: {
        200: promotionResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => promotionController.remove(auth, params.id),
    {
      params: promotionParams,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/:id/stats",
    ({ auth, params }) => promotionController.stats(auth, params.id),
    {
      params: promotionParams,
      response: {
        200: promotionStatsResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
