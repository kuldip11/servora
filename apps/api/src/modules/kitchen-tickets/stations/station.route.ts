import { Elysia } from "elysia";
import {
  createKitchenStationBodySchema,
  kitchenItemRouteListResponseSchema,
  kitchenItemRouteResponseSchema,
  kitchenNullableItemRouteResponseSchema,
  kitchenStationIdParamsSchema,
  kitchenStationListQuerySchema,
  kitchenStationListResponseSchema,
  kitchenStationResponseSchema,
  nullSuccessResponseSchema,
  removeKitchenRouteQuerySchema,
  setKitchenRouteBodySchema,
  standardErrorResponseSchemas,
  updateKitchenStationBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import {
  toKitchenItemRouteResponse,
  toKitchenStationResponse,
} from "./station.mapper";
import { stationService } from "./station.service";

export const kitchenStationsRouter = new Elysia({
  prefix: "/api/kitchen/stations",
})
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth, query }) =>
      successResponse(
        (await stationService.list(auth, query.branchId)).map(
          toKitchenStationResponse,
        ),
      ),
    {
      query: kitchenStationListQuerySchema,
      response: {
        200: kitchenStationListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    async ({ auth, body, set }) => {
      set.status = 201;
      return createdResponse(
        toKitchenStationResponse(await stationService.create(auth, body)),
      );
    },
    {
      body: createKitchenStationBodySchema,
      response: {
        201: kitchenStationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toKitchenStationResponse(
          await stationService.update(auth, params.id, body),
        ),
      ),
    {
      params: kitchenStationIdParamsSchema,
      body: updateKitchenStationBodySchema,
      response: {
        200: kitchenStationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    async ({ auth, params }) => {
      await stationService.remove(auth, params.id);
      return successResponse(null);
    },
    {
      params: kitchenStationIdParamsSchema,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/routes/:id",
    async ({ auth, params }) =>
      successResponse(
        (await stationService.listRoutes(auth, params.id)).map(
          toKitchenItemRouteResponse,
        ),
      ),
    {
      params: kitchenStationIdParamsSchema,
      response: {
        200: kitchenItemRouteListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/routes/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toKitchenItemRouteResponse(
          await stationService.setRoute(auth, params.id, body),
        ),
      ),
    {
      params: kitchenStationIdParamsSchema,
      body: setKitchenRouteBodySchema,
      response: {
        200: kitchenItemRouteResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/routes/:id",
    async ({ auth, params, query }) => {
      const removed = await stationService.removeRoute(
        auth,
        params.id,
        query.modifierOptionId,
      );
      return successResponse(
        removed ? toKitchenItemRouteResponse(removed) : null,
      );
    },
    {
      params: kitchenStationIdParamsSchema,
      query: removeKitchenRouteQuerySchema,
      response: {
        200: kitchenNullableItemRouteResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
