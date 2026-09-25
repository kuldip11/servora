import { getDomainData, type DomainHttpClient } from "./shared";

export interface AvailabilityDashboardParams {
  channel: string;
  fulfillmentType: string;
  cause?: string;
}

export const createAvailabilityApi = (client: DomainHttpClient) => {
  return {
    dashboard<T>(
      params: AvailabilityDashboardParams,
      signal?: AbortSignal,
    ): Promise<T> {
      return getDomainData<T>(client, "/menu/availability/dashboard", {
        params,
        ...(signal ? { signal } : {}),
      });
    },
  };
};
