// Compatibility re-exports during the API contract migration.
// Authoritative transport schemas live in @pos/contracts.
export {
  branchIdParamsSchema as branchIdParams,
  createBranchBodySchema as createBranchBody,
  updateBranchBodySchema as updateBranchBody,
} from "@pos/contracts";
