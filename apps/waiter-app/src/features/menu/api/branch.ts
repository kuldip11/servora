import { createBranchesApi, type BranchDto } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const branchesApi = createBranchesApi(apiClient);

export const fetchMyBranch = async (
  signal?: AbortSignal,
): Promise<BranchDto | undefined> => {
  return (await branchesApi.list(signal))[0];
};
