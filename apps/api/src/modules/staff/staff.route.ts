import { Elysia } from "elysia";
import {
  createStaffBodySchema,
  staffIdParamsSchema,
  staffListQuerySchema,
  staffListResponseSchema,
  staffMemberResponseSchema,
  staffRemoveResponseSchema,
  standardErrorResponseSchemas,
  updateStaffBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { staffController } from "./staff.controller";

export const staffRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/staff/", ({ auth, query }) => staffController.list(auth, query), {
    query: staffListQuerySchema,
    response: { 200: staffListResponseSchema, ...standardErrorResponseSchemas },
  })
  .post(
    "/api/staff/",
    ({ auth, body, set }) => {
      set.status = 201;
      return staffController.create(auth, body);
    },
    {
      body: createStaffBodySchema,
      response: {
        201: staffMemberResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/api/staff/:id",
    ({ auth, params, body }) => staffController.update(auth, params.id, body),
    {
      params: staffIdParamsSchema,
      body: updateStaffBodySchema,
      response: {
        200: staffMemberResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/api/staff/:id",
    ({ auth, params }) => staffController.remove(auth, params.id),
    {
      params: staffIdParamsSchema,
      response: {
        200: staffRemoveResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
