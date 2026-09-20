import { Elysia } from "elysia";
import {
  nullSuccessResponseSchema,
  priceRuleListResponseSchema,
  priceRuleResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { priceRuleController } from "./price-rule.controller";
import {
  createHappyHourBody,
  createPriceRuleBody,
  listPriceRulesQuery,
  priceRuleParams,
  updatePriceRuleBody,
} from "./price-rule.validator";

export const priceRulesRouter = new Elysia({ prefix: "/api/menu/price-rules" })
  .use(requireAuthPlugin())
  .get(
    "/",
    ({ auth, query }) =>
      priceRuleController.list(
        auth,
        query.menuItemId,
        query.organizationId,
        query.menuItemSku,
      ),
    {
      query: listPriceRulesQuery,
      response: {
        200: priceRuleListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return priceRuleController.create(auth, body);
    },
    {
      body: createPriceRuleBody,
      response: {
        201: priceRuleResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/happy-hour",
    ({ auth, body, set }) => {
      set.status = 201;
      return priceRuleController.createHappyHour(auth, body);
    },
    {
      body: createHappyHourBody,
      response: {
        201: priceRuleListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    ({ auth, params, body }) =>
      priceRuleController.update(auth, params.id, body),
    {
      params: priceRuleParams,
      body: updatePriceRuleBody,
      response: {
        200: priceRuleResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => priceRuleController.remove(auth, params.id),
    {
      params: priceRuleParams,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
