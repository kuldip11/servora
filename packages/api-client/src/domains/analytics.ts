import { getDomainData, type DomainHttpClient } from "./shared";

export const createAnalyticsApi = (client: DomainHttpClient) => {
  return {
    dashboard<T>(signal?: AbortSignal): Promise<T> {
      return getDomainData<T>(
        client,
        "/analytics/dashboard",
        signal ? { signal } : undefined,
      );
    },
    costMargin<T>(
      params: Record<string, string | number | undefined> = {},
      signal?: AbortSignal,
    ): Promise<T> {
      return getDomainData<T>(client, "/analytics/cost-margin", {
        params,
        ...(signal ? { signal } : {}),
      });
    },
    menuEngineering<T>(windowDays: number, signal?: AbortSignal): Promise<T> {
      return getDomainData<T>(client, "/analytics/menu-engineering", {
        params: { windowDays },
        ...(signal ? { signal } : {}),
      });
    },
  };
};
