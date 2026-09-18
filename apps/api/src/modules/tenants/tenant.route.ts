import { Elysia } from "elysia";
import {
  createTenantBodySchema,
  standardErrorResponseSchemas,
  tenantCreatedResponseSchema,
  tenantIdParamsSchema,
  tenantListResponseSchema,
  tenantResponseSchema,
  updateTenantBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { tenantController } from "./tenant.controller";

export const tenantsRouter = new Elysia({ prefix: "/api/tenants" })
  .use(requireAuthPlugin())
  .get("/", ({ auth }) => tenantController.list(auth), {
    response: {
      200: tenantListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .post(
    "/",
    ({ auth, body, set }) => {
      set.status = 201;
      return tenantController.create(auth, body);
    },
    {
      body: createTenantBodySchema,
      response: {
        201: tenantCreatedResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/:id",
    ({ auth, params, body }) => tenantController.update(auth, params.id, body),
    {
      params: tenantIdParamsSchema,
      body: updateTenantBodySchema,
      response: { 200: tenantResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/:id",
    ({ auth, params }) => tenantController.archive(auth, params.id),
    {
      params: tenantIdParamsSchema,
      response: { 200: tenantResponseSchema, ...standardErrorResponseSchemas },
    },
  );
