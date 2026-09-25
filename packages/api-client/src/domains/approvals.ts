import {
  getDomainData,
  postDomainData,
  putDomainData,
  type DomainHttpClient,
} from "./shared";

export interface ManagerApprovalInput {
  actionType: "VOID" | "COMP";
  orderId: string;
  orderItemId: string;
  managerEmail: string;
  password: string;
}

export interface ManagerApprovalResult {
  token: string;
}

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
    listThresholds<T>(signal?: AbortSignal): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        "/approvals/thresholds",
        signal ? { signal } : undefined,
      );
    },
    setThreshold<T>(
      actionType: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return putDomainData<T>(
        client,
        `/approvals/thresholds/${actionType}`,
        input,
      );
    },
  };
};
