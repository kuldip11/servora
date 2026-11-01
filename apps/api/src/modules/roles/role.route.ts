import { Elysia } from "elysia";
import {
  roleArchivedResponseSchema,
  roleResponseSchema,
  rolesListResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { roleController } from "./role.controller";
import { createRoleBody, roleIdParams, updateRoleBody } from "./role.validator";

export const rolesRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/roles/", ({ auth }) => roleController.list(auth), {
    response: { 200: rolesListResponseSchema, ...standardErrorResponseSchemas },
  })
  .post(
    "/api/roles/",
    ({ auth, body, set }) => {
      set.status = 201;
      return roleController.create(auth, body);
    },
    {
      body: createRoleBody,
      response: { 201: roleResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .patch(
    "/api/roles/:id",
    ({ auth, params, body }) => roleController.update(auth, params.id, body),
    {
      params: roleIdParams,
      body: updateRoleBody,
      response: { 200: roleResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/api/roles/:id",
    ({ auth, params }) => roleController.archive(auth, params.id),
    {
      params: roleIdParams,
      response: {
        200: roleArchivedResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
