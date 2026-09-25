import { createApprovalsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const approvalsApi = createApprovalsApi(apiClient);

export type ApprovalAction = "VOID" | "COMP";
export type ThresholdRow = {
  id: string;
  actionType: ApprovalAction;
  thresholdAmount: string | number;
  requiresRole: string;
};

export type ThresholdDraft = {
  thresholdAmount: string;
  requiresRole: string;
};

export const approvalThresholdsService = {
  list: (signal?: AbortSignal) =>
    approvalsApi.listThresholds<ThresholdRow>(signal),
  save: (actionType: ApprovalAction, draft: ThresholdDraft) =>
    approvalsApi.setThreshold<ThresholdRow>(actionType, {
      thresholdAmount: Number(draft.thresholdAmount),
      requiresRole: draft.requiresRole.trim(),
    }),
};
