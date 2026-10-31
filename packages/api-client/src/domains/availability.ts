import type {
  AvailabilityDashboardQuery,
  AvailabilityDashboardResponse,
} from "@pos/contracts";
import { getDomainData, type DomainHttpClient } from "./shared";

export type AvailabilityDashboardParams = AvailabilityDashboardQuery;
export type AvailabilityDashboardDto = AvailabilityDashboardResponse;

export const createAvailabilityApi = (client: DomainHttpClient) => {
  return {
    dashboard(
      params: AvailabilityDashboardParams,
      signal?: AbortSignal,
    ): Promise<AvailabilityDashboardDto> {
      return getDomainData<AvailabilityDashboardDto>(
        client,
        "/menu/availability/dashboard",
        {
          params,
          ...(signal ? { signal } : {}),
        },
      );
    },
  };
};
