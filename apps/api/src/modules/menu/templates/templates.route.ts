import { Elysia } from "elysia";
import {
  menuTemplateApplyResponseSchema,
  menuTemplateListResponseSchema,
  menuTemplateResponseSchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { templatesController } from "./templates.controller";
import {
  createFromCategoryBody,
  applyTemplateBody,
  templateIdParams,
  categoryIdParams,
} from "./templates.validator";

export const menuTemplatesRouter = new Elysia({ prefix: "/api/menu/templates" })
  .use(requireAuthPlugin())
  .get("/", ({ auth }) => templatesController.list(auth), {
    response: {
      200: menuTemplateListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .get("/:id", ({ auth, params }) => templatesController.get(auth, params.id), {
    params: templateIdParams,
    response: {
      200: menuTemplateResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/from-category/:categoryId",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return templatesController.createFromCategory(
        auth,
        params.categoryId,
        body.name,
        body.description,
      );
    },
    {
      params: categoryIdParams,
      body: createFromCategoryBody,
      response: {
        201: menuTemplateResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/:id/apply",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return templatesController.apply(auth, params.id, body ?? {});
    },
    {
      params: templateIdParams,
      body: applyTemplateBody,
      response: {
        201: menuTemplateApplyResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => templatesController.delete(auth, params.id),
    {
      params: templateIdParams,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
