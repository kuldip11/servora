import { queryOptions } from "@tanstack/react-query";
import { operationsKeys } from "./query-keys";
import { operationsService } from "./services/operations.service";
import { queryFreshness, queryPolling } from "@/shared/lib/query-policy";

export const operationsSnapshotQuery = () =>
  queryOptions({
    queryKey: operationsKeys.snapshot(),
    queryFn: ({ signal }) => operationsService.snapshot(signal),
    staleTime: queryFreshness.nearLive,
    refetchInterval: queryPolling.operations,
  });
