import { queryOptions } from "@tanstack/react-query";
import { differentiatorKeys } from "./query-keys";
import { differentiatorsService } from "./services/differentiators.service";
import { queryFreshness } from "@/shared/lib/query-policy";

export const differentiatorMenuChoicesQuery = () =>
  queryOptions({
    queryKey: differentiatorKeys.menuChoices(),
    queryFn: differentiatorsService.menuChoices,
    staleTime: queryFreshness.normal,
  });

export const differentiatorAvailabilityQuery = (
  channel: string,
  fulfillment: string,
  cause: string,
) =>
  queryOptions({
    queryKey: differentiatorKeys.availability(channel, fulfillment, cause),
    queryFn: () =>
      differentiatorsService.availability(channel, fulfillment, cause),
    staleTime: queryFreshness.operational,
  });

export const differentiatorEngineeringQuery = (windowDays: string) =>
  queryOptions({
    queryKey: differentiatorKeys.engineering(windowDays),
    queryFn: () => differentiatorsService.engineering(windowDays),
    staleTime: queryFreshness.operational,
  });
