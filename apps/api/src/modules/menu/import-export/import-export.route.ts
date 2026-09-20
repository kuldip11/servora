import { Elysia } from "elysia";
import {
  menuBinaryFileResponseSchema,
  menuImportCommitResponseSchema,
  menuImportValidationResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { importExportController } from "./import-export.controller";
import {
  exportItemsQuery,
  exportQuery,
  importFileBody,
} from "./import-export.validator";
import type { ExportFormat } from "./import-export.service";

const toFormat = (raw: string | undefined): ExportFormat => {
  return raw === "xlsx" ? "xlsx" : "csv";
};

const fileResponseSchemas = {
  200: menuBinaryFileResponseSchema,
  ...standardErrorResponseSchemas,
};

export const menuImportExportRouter = new Elysia({ prefix: "/api/menu" })
  .use(requireAuthPlugin())
  .get(
    "/export/items",
    ({ auth, query }) =>
      importExportController.exportItems(
        auth,
        toFormat(query.format),
        query.branchId,
      ),
    { query: exportItemsQuery, response: fileResponseSchemas },
  )
  .get(
    "/export/categories",
    ({ auth, query }) =>
      importExportController.exportCategories(auth, toFormat(query.format)),
    { query: exportQuery, response: fileResponseSchemas },
  )
  .get(
    "/export/recipes",
    ({ auth, query }) =>
      importExportController.exportRecipes(auth, toFormat(query.format)),
    { query: exportQuery, response: fileResponseSchemas },
  )
  .get(
    "/export/modifiers",
    ({ auth, query }) =>
      importExportController.exportModifiers(auth, toFormat(query.format)),
    { query: exportQuery, response: fileResponseSchemas },
  )
  .get(
    "/import/items/template",
    ({ query }) =>
      importExportController.importTemplate(toFormat(query.format)),
    { query: exportQuery, response: fileResponseSchemas },
  )
  .post(
    "/import/items/validate",
    ({ auth, body }) => importExportController.validateImport(auth, body.file),
    {
      body: importFileBody,
      response: {
        200: menuImportValidationResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/import/items/commit",
    ({ auth, body }) => importExportController.commitImport(auth, body.file),
    {
      body: importFileBody,
      response: {
        200: menuImportCommitResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
