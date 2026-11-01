import { t } from "elysia";
export {
  menuExportItemsQuerySchema as exportItemsQuery,
  menuExportQuerySchema as exportQuery,
} from "@pos/contracts";

// Multipart File is an Elysia-specific parser boundary and intentionally remains local.
export const importFileBody = t.Object({
  file: t.File(),
});
