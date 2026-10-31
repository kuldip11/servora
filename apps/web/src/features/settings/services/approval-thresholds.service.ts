import { createApprovalsApi, type ApprovalThresholdDto } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const approvalsApi = createApprovalsApi(apiClient);

export type ApprovalAction = "VOID" | "COMP";
export type ThresholdRow = ApprovalThresholdDto;

export type ThresholdDraft = {
  thresholdAmount: string;
  requiresRole: string;
};

export const approvalThresholdsService = {
  list: (signal?: AbortSignal) => approvalsApi.listThresholds(signal),
  save: (actionType: ApprovalAction, draft: ThresholdDraft) =>
    approvalsApi.setThreshold(actionType, {
      thresholdAmount: Number(draft.thresholdAmount),
      requiresRole: draft.requiresRole.trim(),
    }),
};
