import { Elysia } from "elysia";
import {
  createMenuItemBodySchema,
  duplicateMenuItemBodySchema,
  menuItemIdParamsSchema,
  menuItemListResponseSchema,
  menuItemResponseSchema,
  menuItemStatusParamsSchema,
  menuItemStatusQuerySchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
  updateMenuItemAvailabilityBodySchema,
  updateMenuItemBodySchema,
  updateMenuItemStatusBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { itemController } from "./item.controller";

export const menuItemsRouter = new Elysia({ prefix: "/api/menu/items" })
  .use(requireAuthPlugin())
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return itemController.create(auth, body);
    },
    {
      body: createMenuItemBodySchema,
      response: {
        201: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/status/:status",
    ({ auth, params, query }) =>
      itemController.listByStatus(auth, params.status, query.categoryId),
    {
      params: menuItemStatusParamsSchema,
      query: menuItemStatusQuerySchema,
      response: {
        200: menuItemListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get("/:id", ({ auth, params }) => itemController.getById(auth, params.id), {
    params: menuItemIdParamsSchema,
    response: { 200: menuItemResponseSchema, ...standardErrorResponseSchemas },
  })
  .patch(
    "/:id",
    ({ auth, params, body }) => itemController.update(auth, params.id, body),
    {
      params: menuItemIdParamsSchema,
      body: updateMenuItemBodySchema,
      response: {
        200: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => itemController.remove(auth, params.id),
    {
      params: menuItemIdParamsSchema,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/:id/duplicate",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return itemController.duplicate(auth, params.id, body ?? {});
    },
    {
      params: menuItemIdParamsSchema,
      body: duplicateMenuItemBodySchema,
      response: {
        201: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id/publish",
    ({ auth, params }) => itemController.publish(auth, params.id),
    {
      params: menuItemIdParamsSchema,
      response: {
        200: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id/unpublish",
    ({ auth, params }) => itemController.unpublish(auth, params.id),
    {
      params: menuItemIdParamsSchema,
      response: {
        200: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/:id/status",
    ({ auth, params, body }) =>
      itemController.updateStatus(auth, params.id, body.status, body.reason),
    {
      params: menuItemIdParamsSchema,
      body: updateMenuItemStatusBodySchema,
      response: {
        200: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id/availability",
    ({ auth, params, body }) =>
      itemController.updateAvailability(
        auth,
        params.id,
        body.isAvailable,
        body.reason,
      ),
    {
      params: menuItemIdParamsSchema,
      body: updateMenuItemAvailabilityBodySchema,
      response: {
        200: menuItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
