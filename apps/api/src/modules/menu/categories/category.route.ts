import { Elysia } from "elysia";
import {
  menuCategoryListResponseSchema,
  menuCategoryResponseSchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { categoryController } from "./category.controller";
import {
  createCategoryBody,
  updateCategoryBody,
  categoryIdParams,
} from "./category.validator";

export const menuCategoriesRouter = new Elysia({
  prefix: "/api/menu/categories",
})
  .use(requireAuthPlugin())
  .get("/", ({ auth }) => categoryController.list(auth), {
    response: {
      200: menuCategoryListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return categoryController.create(auth, body);
    },
    {
      body: createCategoryBody,
      response: {
        201: menuCategoryResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    ({ auth, params, body }) =>
      categoryController.update(auth, params.id, body),
    {
      params: categoryIdParams,
      body: updateCategoryBody,
      response: {
        200: menuCategoryResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => categoryController.deactivate(auth, params.id),
    {
      params: categoryIdParams,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
