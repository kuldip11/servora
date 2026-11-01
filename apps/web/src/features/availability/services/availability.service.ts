import {
  createAvailabilityApi,
  type AvailabilityDashboardDto,
  type AvailabilityDashboardParams,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const availabilityApi = createAvailabilityApi(apiClient);

export type AvailabilityRow = AvailabilityDashboardDto["rows"][number];

export const availabilityService = {
  async dashboard(
    input: AvailabilityDashboardParams,
    signal?: AbortSignal,
  ): Promise<AvailabilityRow[]> {
    const response = await availabilityApi.dashboard(input, signal);
    return response.rows;
  },
};
