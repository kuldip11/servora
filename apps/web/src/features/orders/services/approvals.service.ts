import { createApprovalsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const approvalsApi = createApprovalsApi(apiClient);

export const approvalsService = {
  requestManagerApproval: approvalsApi.requestManagerApproval,
};
