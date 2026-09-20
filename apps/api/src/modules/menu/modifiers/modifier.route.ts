import { Elysia } from "elysia";
import {
  menuAllergenListResponseSchema,
  menuNullResponseSchema,
  menuTagListResponseSchema,
  menuTagResponseSchema,
  modifierGroupListResponseSchema,
  modifierGroupResponseSchema,
  modifierOptionResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { modifierController } from "./modifier.controller";
import {
  createModifierGroupBody,
  updateModifierGroupBody,
  modifierGroupIdParams,
  modifierOptionIdParams,
  setOptionAvailabilityBody,
  createTagBody,
  tagIdParams,
} from "./modifier.validator";

export const menuModifiersRouter = new Elysia({ prefix: "/api/menu" })
  .use(requireAuthPlugin())

  .get("/modifier-groups", ({ auth }) => modifierController.listGroups(auth), {
    response: {
      200: modifierGroupListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/modifier-groups",
    ({ auth, body, set }) => {
      set.status = 201;
      return modifierController.createGroup(auth, body);
    },
    {
      body: createModifierGroupBody,
      response: {
        201: modifierGroupResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/modifier-groups/:id",
    ({ auth, params, body }) =>
      modifierController.updateGroup(auth, params.id, body),
    {
      params: modifierGroupIdParams,
      body: updateModifierGroupBody,
      response: {
        200: modifierGroupResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )

  .delete(
    "/modifier-groups/:id",
    ({ auth, params }) => modifierController.deleteGroup(auth, params.id),
    {
      params: modifierGroupIdParams,
      response: {
        200: menuNullResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/modifier-options/:id/availability",
    ({ auth, params, body }) =>
      modifierController.setOptionAvailability(
        auth,
        params.id,
        body.isAvailable,
      ),
    {
      params: modifierOptionIdParams,
      body: setOptionAvailabilityBody,
      response: {
        200: modifierOptionResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )

  .get("/tags", ({ auth }) => modifierController.listTags(auth), {
    response: {
      200: menuTagListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/tags",
    ({ auth, body, set }) => {
      set.status = 201;
      return modifierController.createTag(auth, body);
    },
    {
      body: createTagBody,
      response: { 201: menuTagResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/tags/:id",
    ({ auth, params }) => modifierController.deleteTag(auth, params.id),
    {
      params: tagIdParams,
      response: {
        200: menuNullResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )

  .get("/allergens", ({ auth }) => modifierController.listAllergens(auth), {
    response: {
      200: menuAllergenListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  });
