import { queryOptions } from "@tanstack/react-query";
import { branchesService } from "./services/branches.service";
import { branchKeys } from "./query-keys";
import { queryFreshness } from "@/shared/lib/query-policy";

export const branchesQuery = () => {
  return queryOptions({
    queryKey: branchKeys.list(),
    queryFn: ({ signal }) => branchesService.list(signal),
    staleTime: queryFreshness.semiStatic,
  });
};
