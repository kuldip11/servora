import type {
  AnalyticsCostMarginRowResponse,
  AnalyticsDashboardResponse,
  AnalyticsMenuEngineeringRowResponse,
} from "@pos/contracts";
import { getDomainData, type DomainHttpClient } from "./shared";

export type AnalyticsDashboardDto = AnalyticsDashboardResponse;
export type AnalyticsCostMarginRowDto = AnalyticsCostMarginRowResponse;
export type AnalyticsMenuEngineeringRowDto =
  AnalyticsMenuEngineeringRowResponse;

export const createAnalyticsApi = (client: DomainHttpClient) => {
  return {
    dashboard(signal?: AbortSignal): Promise<AnalyticsDashboardDto> {
      return getDomainData<AnalyticsDashboardDto>(
        client,
        "/analytics/dashboard",
        signal ? { signal } : undefined,
      );
    },
    costMargin(
      params: Record<string, string | number | undefined> = {},
      signal?: AbortSignal,
    ): Promise<AnalyticsCostMarginRowDto[]> {
      return getDomainData<AnalyticsCostMarginRowDto[]>(
        client,
        "/analytics/cost-margin",
        {
          params,
          ...(signal ? { signal } : {}),
        },
      );
    },
    menuEngineering(
      windowDays: number,
      signal?: AbortSignal,
    ): Promise<AnalyticsMenuEngineeringRowDto[]> {
      return getDomainData<AnalyticsMenuEngineeringRowDto[]>(
        client,
        "/analytics/menu-engineering",
        {
          params: { windowDays },
          ...(signal ? { signal } : {}),
        },
      );
    },
  };
};
