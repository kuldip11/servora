import { Elysia } from "elysia";
import {
  activeMenuListResponseSchema,
  activeMenusQuerySchema,
  createMenuBodySchema,
  menuIdParamsSchema,
  menuListResponseSchema,
  menuResponseSchema,
  menuScheduleBodySchema,
  menuScheduleListResponseSchema,
  menuScheduleResponseSchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
  updateMenuBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { menuController } from "./menu.controller";

export const menusRouter = new Elysia({ prefix: "/api/menu/menus" })
  .use(requireAuthPlugin())
  .get("/", ({ auth }) => menuController.list(auth), {
    response: { 200: menuListResponseSchema, ...standardErrorResponseSchemas },
  })
  .get(
    "/active",
    ({ auth, query }) =>
      menuController.listActive(auth, query.channel, query.fulfillmentType),
    {
      query: activeMenusQuerySchema,
      response: {
        200: activeMenuListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return menuController.create(auth, body);
    },
    {
      body: createMenuBodySchema,
      response: { 201: menuResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .get(
    "/:id/schedules",
    ({ auth, params }) => menuController.listSchedules(auth, params.id),
    {
      params: menuIdParamsSchema,
      response: {
        200: menuScheduleListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/:id/schedules",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return menuController.createSchedule(auth, params.id, body);
    },
    {
      params: menuIdParamsSchema,
      body: menuScheduleBodySchema,
      response: {
        201: menuScheduleResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/schedules/:id",
    ({ auth, params }) => menuController.deleteSchedule(auth, params.id),
    {
      params: menuIdParamsSchema,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get("/:id", ({ auth, params }) => menuController.getById(auth, params.id), {
    params: menuIdParamsSchema,
    response: { 200: menuResponseSchema, ...standardErrorResponseSchemas },
  })
  .patch(
    "/:id",
    ({ auth, params, body }) => menuController.update(auth, params.id, body),
    {
      params: menuIdParamsSchema,
      body: updateMenuBodySchema,
      response: { 200: menuResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/:id/publish",
    ({ auth, params }) => menuController.publish(auth, params.id),
    {
      params: menuIdParamsSchema,
      response: { 200: menuResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/:id/unpublish",
    ({ auth, params }) => menuController.unpublish(auth, params.id),
    {
      params: menuIdParamsSchema,
      response: { 200: menuResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => menuController.remove(auth, params.id),
    {
      params: menuIdParamsSchema,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
