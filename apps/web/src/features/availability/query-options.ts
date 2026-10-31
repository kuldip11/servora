import { queryOptions } from "@tanstack/react-query";
import { availabilityKeys } from "./query-keys";
import { availabilityService } from "./services/availability.service";
import { queryFreshness } from "@/shared/lib/query-policy";
import type { AvailabilityDashboardParams } from "@pos/api-client";

export const availabilityDashboardQuery = (input: {
  channel: string;
  fulfillmentType: string;
  cause?: string;
}) =>
  queryOptions({
    queryKey: availabilityKeys.dashboard(
      input.channel,
      input.fulfillmentType,
      input.cause,
    ),
    queryFn: ({ signal }) =>
      availabilityService.dashboard(
        input as AvailabilityDashboardParams,
        signal,
      ),
    staleTime: queryFreshness.operational,
  });
