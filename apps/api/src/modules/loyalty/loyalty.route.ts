import { Elysia } from "elysia";
import {
  loyaltyCustomerBodySchema,
  loyaltyCustomerListResponseSchema,
  loyaltyCustomerResponseSchema,
  loyaltyNullResponseSchema,
  loyaltyTierBodySchema,
  loyaltyTierListResponseSchema,
  loyaltyTierResponseSchema,
  standardErrorResponseSchemas,
  updateLoyaltyCustomerBodySchema,
  updateLoyaltyTierBodySchema,
  uuidSchema,
} from "@pos/contracts";
import { Type } from "@sinclair/typebox";
import { requireAuthPlugin } from "@/core/auth";
import { successResponse, createdResponse } from "@/core/response";
import { loyaltyService } from "./loyalty.service";
import {
  toLoyaltyCustomerResponse,
  toLoyaltyTierResponse,
} from "./loyalty.mapper";

const idParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const loyaltyRouter = new Elysia({ prefix: "/api/loyalty" })
  .use(requireAuthPlugin())
  .get(
    "/tiers",
    async ({ auth }) =>
      successResponse(
        (await loyaltyService.listTiers(auth)).map(toLoyaltyTierResponse),
      ),
    {
      response: {
        200: loyaltyTierListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/tiers",
    async ({ auth, body, set }) => {
      set.status = 201;
      return createdResponse(
        toLoyaltyTierResponse(await loyaltyService.createTier(auth, body)),
      );
    },
    {
      body: loyaltyTierBodySchema,
      response: {
        201: loyaltyTierResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/tiers/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toLoyaltyTierResponse(
          await loyaltyService.updateTier(auth, params.id, body),
        ),
      ),
    {
      params: idParamsSchema,
      body: updateLoyaltyTierBodySchema,
      response: {
        200: loyaltyTierResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/tiers/:id",
    async ({ auth, params }) => {
      await loyaltyService.removeTier(auth, params.id);
      return successResponse(null);
    },
    {
      params: idParamsSchema,
      response: {
        200: loyaltyNullResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/customers",
    async ({ auth }) =>
      successResponse(
        (await loyaltyService.listCustomers(auth)).map(
          toLoyaltyCustomerResponse,
        ),
      ),
    {
      response: {
        200: loyaltyCustomerListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/customers",
    async ({ auth, body, set }) => {
      set.status = 201;
      return createdResponse(
        toLoyaltyCustomerResponse(
          await loyaltyService.createCustomer(auth, body),
        ),
      );
    },
    {
      body: loyaltyCustomerBodySchema,
      response: {
        201: loyaltyCustomerResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/customers/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toLoyaltyCustomerResponse(
          await loyaltyService.updateCustomer(auth, params.id, body),
        ),
      ),
    {
      params: idParamsSchema,
      body: updateLoyaltyCustomerBodySchema,
      response: {
        200: loyaltyCustomerResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
