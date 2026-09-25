import { queryOptions } from "@tanstack/react-query";
import { tablesService } from "./services/tables.service";
import { tableKeys } from "./query-keys";
import { queryFreshness } from "@/shared/lib/query-policy";

export const tablesQuery = () => {
  return queryOptions({
    queryKey: tableKeys.list(),
    queryFn: ({ signal }) => tablesService.list(signal),
    staleTime: queryFreshness.operational,
  });
};

export const takeawayQrQuery = (branchId: string) => {
  return queryOptions({
    queryKey: tableKeys.takeawayQr(branchId),
    queryFn: ({ signal }) => tablesService.getTakeawayQr(branchId, signal),
    enabled: Boolean(branchId),
    staleTime: queryFreshness.normal,
  });
};
