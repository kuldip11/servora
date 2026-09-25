import { createAvailabilityApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const availabilityApi = createAvailabilityApi(apiClient);

export type AvailabilityRow = {
  entityType: "ITEM" | "VARIANT" | "MODIFIER_OPTION";
  entityId: string;
  menuItemId: string;
  name: string;
  status: string;
  reason: string;
  cause: string;
  branchId: string;
  branchName?: string;
  channel: string;
  fulfillmentType: string;
};

export const availabilityService = {
  async dashboard(
    input: {
      channel: string;
      fulfillmentType: string;
      cause?: string;
    },
    signal?: AbortSignal,
  ): Promise<AvailabilityRow[]> {
    const response = await availabilityApi.dashboard<{
      rows: AvailabilityRow[];
    }>(input, signal);
    return response.rows;
  },
};
