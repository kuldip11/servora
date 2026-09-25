import { queryOptions } from "@tanstack/react-query";
import { analyticsService } from "./services/analytics.service";
import { analyticsKeys } from "./query-keys";
import { queryFreshness, queryPolling } from "@/shared/lib/query-policy";

export const dashboardStatsQuery = (
  refetchInterval: number | false = queryPolling.dashboard,
) => {
  return queryOptions({
    queryKey: analyticsKeys.dashboard(),
    queryFn: ({ signal }) => analyticsService.dashboard(signal),
    staleTime: queryFreshness.nearLive,
    refetchInterval,
  });
};

export const costMarginQuery = (categoryId?: string, enabled = true) => {
  return queryOptions({
    queryKey: analyticsKeys.costMargin(categoryId),
    queryFn: ({ signal }) => analyticsService.costMargin(categoryId, signal),
    enabled,
    staleTime: queryFreshness.operational,
  });
};

export const menuEngineeringQuery = (windowDays: number) =>
  queryOptions({
    queryKey: analyticsKeys.menuEngineering(windowDays),
    queryFn: ({ signal }) =>
      analyticsService.menuEngineering(windowDays, signal),
    staleTime: queryFreshness.operational,
  });
