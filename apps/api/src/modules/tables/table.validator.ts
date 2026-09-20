// Compatibility re-exports during the API contract migration.
// Authoritative transport schemas live in @pos/contracts.
export {
  createTableBodySchema as createTableBody,
  tableIdParamsSchema as tableIdParams,
  updateTableBodySchema as updateTableBody,
  updateTableStatusBodySchema as updateTableStatusBody,
} from "@pos/contracts";
