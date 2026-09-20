import { Elysia } from "elysia";
import {
  bulkDeleteResponseSchema,
  bulkOperationResponseSchema,
  bulkPriceOperationResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { bulkOpsController } from "./bulk-ops.controller";
import {
  bulkStatusBody,
  bulkCategoryBody,
  bulkTagsBody,
  bulkModifiersBody,
  bulkPriceBody,
  bulkDeleteBody,
} from "./bulk-ops.validator";

export const menuBulkOpsRouter = new Elysia({ prefix: "/api/menu/items/bulk" })
  .use(requireAuthPlugin())
  .post(
    "/status",
    ({ auth, body }) =>
      bulkOpsController.updateItemsStatus(
        auth,
        body.itemIds,
        body.status,
        body.reason,
      ),
    {
      body: bulkStatusBody,
      response: {
        200: bulkOperationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/category",
    ({ auth, body }) =>
      bulkOpsController.updateItemsCategory(
        auth,
        body.itemIds,
        body.categoryId,
      ),
    {
      body: bulkCategoryBody,
      response: {
        200: bulkOperationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/tags",
    ({ auth, body }) =>
      bulkOpsController.bulkSetItemTags(
        auth,
        body.itemIds,
        body.tagIds,
        body.mode,
      ),
    {
      body: bulkTagsBody,
      response: {
        200: bulkOperationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/modifiers",
    ({ auth, body }) =>
      bulkOpsController.bulkSetItemModifierGroups(
        auth,
        body.itemIds,
        body.modifierGroupIds,
        body.mode,
      ),
    {
      body: bulkModifiersBody,
      response: {
        200: bulkOperationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/price",
    ({ auth, body }) =>
      bulkOpsController.bulkUpdatePrice(
        auth,
        body.itemIds,
        body.priceChange,
        body.mode,
      ),
    {
      body: bulkPriceBody,
      response: {
        200: bulkPriceOperationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/delete",
    ({ auth, body }) => bulkOpsController.bulkDeleteItems(auth, body.itemIds),
    {
      body: bulkDeleteBody,
      response: {
        200: bulkDeleteResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
