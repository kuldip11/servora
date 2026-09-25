import {
  createAnalyticsApi,
  createAvailabilityApi,
  createBranchesApi,
} from "@pos/api-client";
import type { Branch, DashboardStats } from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";

const analyticsApi = createAnalyticsApi(apiClient);
const availabilityApi = createAvailabilityApi(apiClient);
const branchesApi = createBranchesApi(apiClient);

export type AvailabilityException = {
  entityType: "ITEM" | "VARIANT" | "MODIFIER_OPTION";
  entityId: string;
  name: string;
  status: string;
  reason: string;
  cause: string;
  branchId: string;
};

export type OperationsSnapshot = {
  dashboard: DashboardStats;
  branches: Branch[];
  availability: AvailabilityException[];
};

export const operationsService = {
  async snapshot(signal?: AbortSignal): Promise<OperationsSnapshot> {
    const [dashboard, branches, availability] = await Promise.all([
      analyticsApi.dashboard<DashboardStats>(signal),
      branchesApi.list(signal),
      availabilityApi.dashboard<{ rows: AvailabilityException[] }>(
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
