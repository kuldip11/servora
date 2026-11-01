import {
  createAnalyticsApi,
  type AnalyticsCostMarginRowDto,
  type AnalyticsDashboardDto,
  type AnalyticsMenuEngineeringRowDto,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const analyticsApi = createAnalyticsApi(apiClient);
export type MenuEngineeringRow = AnalyticsMenuEngineeringRowDto;

export const analyticsService = {
  async dashboard(signal?: AbortSignal): Promise<AnalyticsDashboardDto> {
    return analyticsApi.dashboard(signal);
  },

  async costMargin(
    categoryId?: string,
    signal?: AbortSignal,
  ): Promise<AnalyticsCostMarginRowDto[]> {
    return analyticsApi.costMargin(categoryId ? { categoryId } : {}, signal);
  },

  async menuEngineering(
    windowDays: number,
    signal?: AbortSignal,
  ): Promise<MenuEngineeringRow[]> {
    return analyticsApi.menuEngineering(windowDays, signal);
  },
};
