import { Elysia } from "elysia";
import {
  createOrganizationBodySchema,
  createOrganizationMenuBodySchema,
  loyaltyTierBodySchema,
  loyaltyTierDeleteResponseSchema,
  loyaltyTierListResponseSchema,
  loyaltyTierResponseSchema,
  organizationCreatedResponseSchema,
  organizationIdParamsSchema,
  organizationListResponseSchema,
  organizationLoyaltyTierParamsSchema,
  organizationMenuParamsSchema,
  organizationMenuResponseSchema,
  organizationMenusResponseSchema,
  organizationNullResponseSchema,
  organizationResponseSchema,
  organizationTenantsResponseSchema,
  standardErrorResponseSchemas,
  updateLoyaltyTierBodySchema,
  updateOrganizationBodySchema,
  updateOrganizationMenuBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { organizationController } from "./organization.controller";

export const organizationsRouter = new Elysia({ prefix: "/api/organizations" })
  .use(requireAuthPlugin())
  .get("/", ({ auth }) => organizationController.list(auth), {
    response: {
      200: organizationListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return organizationController.create(auth, body);
    },
    {
      body: createOrganizationBodySchema,
      response: {
        201: organizationCreatedResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/:id/tenants",
    ({ auth, params }) => organizationController.listTenants(auth, params.id),
    {
      params: organizationIdParamsSchema,
      response: {
        200: organizationTenantsResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/:id/loyalty-tiers",
    ({ auth, params }) =>
      organizationController.listLoyaltyTiers(auth, params.id),
    {
      params: organizationIdParamsSchema,
      response: {
        200: loyaltyTierListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/:id/loyalty-tiers",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return organizationController.createLoyaltyTier(auth, params.id, body);
    },
    {
      params: organizationIdParamsSchema,
      body: loyaltyTierBodySchema,
      response: {
        201: loyaltyTierResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id/loyalty-tiers/:tierId",
    ({ auth, params, body }) =>
      organizationController.updateLoyaltyTier(
        auth,
        params.id,
        params.tierId,
        body,
      ),
    {
      params: organizationLoyaltyTierParamsSchema,
      body: updateLoyaltyTierBodySchema,
      response: {
        200: loyaltyTierResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id/loyalty-tiers/:tierId",
    ({ auth, params }) =>
      organizationController.deleteLoyaltyTier(auth, params.id, params.tierId),
    {
      params: organizationLoyaltyTierParamsSchema,
      response: {
        200: loyaltyTierDeleteResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/:id/menus",
    ({ auth, params }) => organizationController.listMenus(auth, params.id),
    {
      params: organizationIdParamsSchema,
      response: {
        200: organizationMenusResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/:id/menus",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return organizationController.createMenu(auth, params.id, body);
    },
    {
      params: organizationIdParamsSchema,
      body: createOrganizationMenuBodySchema,
      response: {
        201: organizationMenuResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id/menus/:menuId",
    ({ auth, params, body }) =>
      organizationController.updateMenu(auth, params.id, params.menuId, body),
    {
      params: organizationMenuParamsSchema,
      body: updateOrganizationMenuBodySchema,
      response: {
        200: organizationMenuResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id/menus/:menuId",
    ({ auth, params }) =>
      organizationController.deleteMenu(auth, params.id, params.menuId),
    {
      params: organizationMenuParamsSchema,
      response: {
        200: organizationNullResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    ({ auth, params, body }) =>
      organizationController.update(auth, params.id, body),
    {
      params: organizationIdParamsSchema,
      body: updateOrganizationBodySchema,
      response: {
        200: organizationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => organizationController.archive(auth, params.id),
    {
      params: organizationIdParamsSchema,
      response: {
        200: organizationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
