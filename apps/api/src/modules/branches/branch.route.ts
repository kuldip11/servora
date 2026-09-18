import { Elysia } from "elysia";
import {
  branchIdParamsSchema,
  branchListResponseSchema,
  branchResponseSchema,
  branchTakeawayQrResponseSchema,
  createBranchBodySchema,
  nullSuccessResponseSchema,
  standardErrorResponseSchemas,
  updateBranchBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { branchController } from "./branch.controller";

export const branchesRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/branches/", ({ auth }) => branchController.list(auth), {
    response: {
      200: branchListResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .get(
    "/api/branches/:id/takeaway-qr",
    ({ auth, params }) => branchController.getTakeawayQr(auth, params.id),
    {
      params: branchIdParamsSchema,
      response: {
        200: branchTakeawayQrResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/branches/:id/takeaway-qr/regenerate",
    ({ auth, params }) =>
      branchController.regenerateTakeawayQr(auth, params.id),
    {
      params: branchIdParamsSchema,
      response: {
        200: branchTakeawayQrResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/branches/",
    ({ auth, body, set }) => {
      set.status = 201;
      return branchController.create(auth, body);
    },
    {
      body: createBranchBodySchema,
      response: { 201: branchResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .patch(
    "/api/branches/:id",
    ({ auth, params, body }) => branchController.update(auth, params.id, body),
    {
      params: branchIdParamsSchema,
      body: updateBranchBodySchema,
      response: { 200: branchResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/api/branches/:id",
    ({ auth, params }) => branchController.deactivate(auth, params.id),
    {
      params: branchIdParamsSchema,
      response: {
        200: nullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
