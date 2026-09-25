import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalThresholdsQuery } from "../query-options";
import { settingsKeys } from "../query-keys";
import {
  approvalThresholdsService,
  type ApprovalAction,
  type ThresholdDraft,
} from "../services/approval-thresholds.service";

export const useApprovalThresholds = () => useQuery(approvalThresholdsQuery());

export const useSaveApprovalThreshold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      actionType,
      draft,
    }: {
      actionType: ApprovalAction;
      draft: ThresholdDraft;
    }) => approvalThresholdsService.save(actionType, draft),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: settingsKeys.approvalThresholds(),
      }),
  });
};
