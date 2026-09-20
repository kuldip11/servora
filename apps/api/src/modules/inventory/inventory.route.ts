import { Elysia } from "elysia";
import {
  createInventoryItemBodySchema,
  createWasteReasonBodySchema,
  inventoryItemArrayResponseSchema,
  inventoryItemIdParamsSchema,
  inventoryItemListResponseSchema,
  inventoryItemResponseSchema,
  inventoryListQuerySchema,
  inventoryRecipeImpactResponseSchema,
  inventoryStockUpdateResponseSchema,
  inventoryTransactionArrayResponseSchema,
  logWasteBodySchema,
  standardErrorResponseSchemas,
  updateStockBodySchema,
  updateWasteReasonBodySchema,
  wasteReasonArrayResponseSchema,
  wasteReasonListQuerySchema,
  wasteReasonResponseSchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { inventoryController } from "./inventory.controller";

export const inventoryRouter = new Elysia()
  .use(requireAuthPlugin())
  .get(
    "/api/inventory/items",
    ({ auth, query }) =>
      inventoryController.list(auth, {
        ...(query.page !== undefined ? { page: query.page } : {}),
        ...(query.limit !== undefined ? { limit: query.limit } : {}),
        ...(query.search !== undefined ? { search: query.search } : {}),
        ...(query.lowStockOnly !== undefined
          ? { lowStockOnly: query.lowStockOnly === "true" }
          : {}),
      }),
    {
      query: inventoryListQuerySchema,
      response: {
        200: inventoryItemListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/inventory/items",
    ({ auth, body, set }) => {
      set.status = 201;
      return inventoryController.create(auth, body);
    },
    {
      body: createInventoryItemBodySchema,
      response: {
        201: inventoryItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/api/inventory/items/:id/stock",
    ({ auth, params, body }) =>
      inventoryController.updateStock(auth, params.id, body),
    {
      params: inventoryItemIdParamsSchema,
      body: updateStockBodySchema,
      response: {
        200: inventoryStockUpdateResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/inventory/alerts/low-stock",
    ({ auth }) => inventoryController.lowStockAlerts(auth),
    {
      response: {
        200: inventoryItemArrayResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/inventory/transactions",
    ({ auth }) => inventoryController.recentTransactions(auth),
    {
      response: {
        200: inventoryTransactionArrayResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/inventory/items/:id/recipe-impact",
    ({ auth, params }) => inventoryController.recipeImpact(auth, params.id),
    {
      params: inventoryItemIdParamsSchema,
      response: {
        200: inventoryRecipeImpactResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/inventory/waste-reasons",
    ({ auth, query }) =>
      inventoryController.listWasteReasons(
        auth,
        query.includeInactive === "true",
      ),
    {
      query: wasteReasonListQuerySchema,
      response: {
        200: wasteReasonArrayResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/inventory/waste-reasons",
    ({ auth, body, set }) => {
      set.status = 201;
      return inventoryController.createWasteReason(auth, body);
    },
    {
      body: createWasteReasonBodySchema,
      response: {
        201: wasteReasonResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/api/inventory/waste-reasons/:id",
    ({ auth, params, body }) =>
      inventoryController.updateWasteReason(auth, params.id, body),
    {
      params: inventoryItemIdParamsSchema,
      body: updateWasteReasonBodySchema,
      response: {
        200: wasteReasonResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/inventory/items/:id/waste",
    ({ auth, params, body }) =>
      inventoryController.logWaste(auth, params.id, body),
    {
      params: inventoryItemIdParamsSchema,
      body: logWasteBodySchema,
      response: {
        200: inventoryStockUpdateResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
