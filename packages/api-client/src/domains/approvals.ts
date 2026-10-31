import {
  getDomainData,
  postDomainData,
  putDomainData,
  type DomainHttpClient,
} from "./shared";

export type ManagerApprovalInput = ManagerApprovalIssueBody;
export type ManagerApprovalResult = ManagerApprovalToken;
export type ApprovalThresholdDto = ApprovalThreshold;
export type ApprovalThresholdInput = ApprovalThresholdUpsertBody;

export const createApprovalsApi = (client: DomainHttpClient) => {
  return {
    requestManagerApproval(
      input: ManagerApprovalInput,
    ): Promise<ManagerApprovalResult> {
      return postDomainData<ManagerApprovalResult>(
        client,
        "/approvals/manager",
        input,
      );
    },
    listThresholds(signal?: AbortSignal): Promise<ApprovalThresholdDto[]> {
      return getDomainData<ApprovalThresholdDto[]>(
        client,
        "/approvals/thresholds",
        signal ? { signal } : undefined,
      );
    },
    setThreshold(
      actionType: ApprovalAction,
      input: ApprovalThresholdInput,
    ): Promise<ApprovalThresholdDto> {
      return putDomainData<ApprovalThresholdDto>(
        client,
        `/approvals/thresholds/${actionType}`,
        input,
      );
    },
  };
};
import type {
  ApprovalAction,
  ApprovalThreshold,
  ApprovalThresholdUpsertBody,
  ManagerApprovalIssueBody,
  ManagerApprovalToken,
} from "@pos/contracts";
