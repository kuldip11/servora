import { createAnalyticsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const analyticsApi = createAnalyticsApi(apiClient);
import type { CostMarginRow, DashboardStats } from "@pos/types";

export type MenuEngineeringRow = {
  menuItemId: string;
  menuItemName: string;
  variantName: string | null;
  margin: number | null;
  marginPercent: number | null;
  salesVolume: number;
  quadrant: "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG" | "COST_MISSING";
  recommendation: string;
};

export const analyticsService = {
  async dashboard(signal?: AbortSignal): Promise<DashboardStats> {
    return analyticsApi.dashboard<DashboardStats>(signal);
  },

  async costMargin(
    categoryId?: string,
    signal?: AbortSignal,
  ): Promise<CostMarginRow[]> {
    return analyticsApi.costMargin<CostMarginRow[]>(
      categoryId ? { categoryId } : {},
      signal,
    );
  },

  async menuEngineering(
    windowDays: number,
    signal?: AbortSignal,
  ): Promise<MenuEngineeringRow[]> {
    return analyticsApi.menuEngineering<MenuEngineeringRow[]>(
      windowDays,
      signal,
    );
  },
};
