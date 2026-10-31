import { voidDomainRequest } from "./shared";
import type {
  BranchResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "@pos/contracts";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export type BranchDto = BranchResponse;
export type BranchInput = CreateBranchRequest;

export const createBranchesApi = (client: DomainHttpClient) => {
  return {
    list(signal?: AbortSignal): Promise<BranchDto[]> {
      return getDomainData<BranchDto[]>(
        client,
        "/branches",
        signal ? { signal } : undefined,
      );
    },
    create(input: BranchInput): Promise<BranchDto> {
      return postDomainData<BranchDto>(client, "/branches", input);
    },
    update(id: string, input: UpdateBranchRequest): Promise<BranchDto> {
      return patchDomainData<BranchDto>(client, `/branches/${id}`, input);
    },
    deactivate(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/branches/${id}`));
    },
  };
};
