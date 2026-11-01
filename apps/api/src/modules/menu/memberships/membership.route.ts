import { Elysia } from "elysia";
import { requireAuthPlugin } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { membershipService } from "./membership.service";
import { toMenuMembershipResponse } from "./membership.mapper";
import {
  menuMembershipListResponseSchema,
  menuMembershipResponseSchema,
  menuNullResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import {
  itemMembershipParams,
  membershipBody,
  membershipParams,
  menuItemsParams,
} from "./membership.validator";

export const menuMembershipsRouter = new Elysia({ prefix: "/api/menu" })
  .use(requireAuthPlugin())
  .get(
    "/items/:id/memberships",
    async ({ auth, params }) =>
      successResponse(
        (await membershipService.listForItem(auth, params.id)).map(
          toMenuMembershipResponse,
        ),
      ),
    {
      params: itemMembershipParams,
      response: {
        200: menuMembershipListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/items/:id/memberships",
    async ({ auth, params, body }) =>
      createdResponse(
        toMenuMembershipResponse(
          await membershipService.assign(auth, params.id, body),
        ),
      ),
    {
      params: itemMembershipParams,
      body: membershipBody,
      response: {
        201: menuMembershipResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/items/:id/memberships/:menuId",
    async ({ auth, params }) => {
      await membershipService.remove(auth, params.id, params.menuId);
      return successResponse(null);
    },
    {
      params: membershipParams,
      response: {
        200: menuNullResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/menus/:id/items",
    async ({ auth, params }) =>
      successResponse(
        (await membershipService.listItems(auth, params.id)).map(
          toMenuMembershipResponse,
        ),
      ),
    {
      params: menuItemsParams,
      response: {
        200: menuMembershipListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
