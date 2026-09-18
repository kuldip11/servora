import { Elysia } from "elysia";
import { requireAuthPlugin } from "@/core/auth";
import { successResponse, createdResponse } from "@/core/response";
import { subRecipeService } from "./sub-recipe.service";
import { toSubRecipeResponse } from "./sub-recipe.mapper";
import {
  deletedResponseSchema,
  standardErrorResponseSchemas,
  subRecipeListResponseSchema,
  subRecipeResponseSchema,
} from "@pos/contracts";
import { subRecipeBody, subRecipeParams } from "./sub-recipe.validator";

export const subRecipesRouter = new Elysia({ prefix: "/api/menu/sub-recipes" })
  .use(requireAuthPlugin())
  .get(
    "/",
    async ({ auth }) =>
      successResponse(
        (await subRecipeService.list(auth)).map(toSubRecipeResponse),
      ),
    {
      response: {
        200: subRecipeListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/",
    async ({ auth, body, set }) => {
      set.status = 201;
      return createdResponse(
        toSubRecipeResponse(await subRecipeService.create(auth, body)),
      );
    },
    {
      body: subRecipeBody,
      response: {
        201: subRecipeResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/:id",
    async ({ auth, params, body }) =>
      successResponse(
        toSubRecipeResponse(
          await subRecipeService.update(auth, params.id, body),
        ),
      ),
    {
      params: subRecipeParams,
      body: subRecipeBody,
      response: {
        200: subRecipeResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    async ({ auth, params }) => {
      await subRecipeService.delete(auth, params.id);
      return successResponse({ deleted: true });
    },
    {
      params: subRecipeParams,
      response: { 200: deletedResponseSchema, ...standardErrorResponseSchemas },
    },
  );
