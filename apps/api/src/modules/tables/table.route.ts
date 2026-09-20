import { Elysia } from "elysia";
import {
  createTableBodySchema,
  standardErrorResponseSchemas,
  tableDeleteResponseSchema,
  tableIdParamsSchema,
  tableListResponseSchema,
  tableResponseSchema,
  updateTableBodySchema,
  updateTableStatusBodySchema,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { tableController } from "./table.controller";

export const tablesRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/tables/", ({ auth }) => tableController.list(auth), {
    response: { 200: tableListResponseSchema, ...standardErrorResponseSchemas },
  })
  .post(
    "/api/tables/",
    ({ auth, body, set }) => {
      set.status = 201;
      return tableController.create(auth, body);
    },
    {
      body: createTableBodySchema,
      response: { 201: tableResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/tables/:id/qr/regenerate",
    ({ auth, params }) => tableController.regenerateQr(auth, params.id),
    {
      params: tableIdParamsSchema,
      response: { 200: tableResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .patch(
    "/api/tables/:id/status",
    ({ auth, params, body }) =>
      tableController.updateStatus(auth, params.id, body.status),
    {
      params: tableIdParamsSchema,
      body: updateTableStatusBodySchema,
      response: { 200: tableResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .patch(
    "/api/tables/:id",
    ({ auth, params, body }) => tableController.update(auth, params.id, body),
    {
      params: tableIdParamsSchema,
      body: updateTableBodySchema,
      response: { 200: tableResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .delete(
    "/api/tables/:id",
    ({ auth, params }) => tableController.remove(auth, params.id),
    {
      params: tableIdParamsSchema,
      response: {
        200: tableDeleteResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
