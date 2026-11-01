import {
  createAnalyticsApi,
  createAvailabilityApi,
  createBranchesApi,
  type AnalyticsDashboardDto,
  type AvailabilityDashboardDto,
  type BranchDto,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const analyticsApi = createAnalyticsApi(apiClient);
const availabilityApi = createAvailabilityApi(apiClient);
const branchesApi = createBranchesApi(apiClient);

export type AvailabilityException = AvailabilityDashboardDto["rows"][number];

export type OperationsSnapshot = {
  dashboard: AnalyticsDashboardDto;
  branches: BranchDto[];
  availability: AvailabilityException[];
};

export const operationsService = {
  async snapshot(signal?: AbortSignal): Promise<OperationsSnapshot> {
    const [dashboard, branches, availability] = await Promise.all([
      analyticsApi.dashboard(signal),
      branchesApi.list(signal),
      availabilityApi.dashboard(
        {
          channel: "UNSCOPED",
          fulfillmentType: "UNSCOPED",
        },
        signal,
      ),
    ]);

    return { dashboard, branches, availability: availability.rows };
  },
};
