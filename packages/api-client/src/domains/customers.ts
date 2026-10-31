import { voidDomainRequest } from "./shared";
import type {
  CustomerGroupResponse,
  CustomerRequestResponse,
  LoyaltyCustomerRequest,
  LoyaltyCustomerResponse,
} from "@pos/contracts";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export type LoyaltyCustomerDto = LoyaltyCustomerResponse;
export type CustomerGroupDto = CustomerGroupResponse;
export type CustomerRequestDto = CustomerRequestResponse;
export type CreateLoyaltyCustomerInput = LoyaltyCustomerRequest;

export interface CustomerGroupInput {
  name: string;
  discountPercent?: number | null;
  discountFixed?: number | null;
}

export const createCustomersApi = (client: DomainHttpClient) => {
  return {
    list(): Promise<LoyaltyCustomerDto[]> {
      return getDomainData<LoyaltyCustomerDto[]>(client, "/loyalty/customers");
    },
    search(signal?: AbortSignal): Promise<LoyaltyCustomerDto[]> {
      return getDomainData<LoyaltyCustomerDto[]>(
        client,
        "/loyalty/customers",
        signal ? { signal } : undefined,
      );
    },
    create(input: CreateLoyaltyCustomerInput): Promise<LoyaltyCustomerDto> {
      return postDomainData<LoyaltyCustomerDto>(
        client,
        "/loyalty/customers",
        input,
      );
    },
    assignTier(
      id: string,
      loyaltyTierId: string | null,
    ): Promise<LoyaltyCustomerDto> {
      return patchDomainData<LoyaltyCustomerDto>(
        client,
        `/loyalty/customers/${id}`,
        { loyaltyTierId },
      );
    },
    listGroups(signal?: AbortSignal): Promise<CustomerGroupDto[]> {
      return getDomainData<CustomerGroupDto[]>(
        client,
        "/customer-groups",
        signal ? { signal } : undefined,
      );
    },
    createGroup(input: CustomerGroupInput): Promise<CustomerGroupDto> {
      return postDomainData<CustomerGroupDto>(
        client,
        "/customer-groups",
        input,
      );
    },
    updateGroup(
      id: string,
      input: CustomerGroupInput,
    ): Promise<CustomerGroupDto> {
      return patchDomainData<CustomerGroupDto>(
        client,
        `/customer-groups/${id}`,
        input,
      );
    },
    deleteGroup(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/customer-groups/${id}`));
    },
    resolveRequest(id: string): Promise<CustomerRequestDto> {
      return patchDomainData<CustomerRequestDto>(
        client,
        `/customer/requests/${id}`,
        { status: "RESOLVED" },
      );
    },
    listRequests(signal?: AbortSignal): Promise<CustomerRequestDto[]> {
      return getDomainData<CustomerRequestDto[]>(
        client,
        "/customer/requests",
        signal ? { signal } : undefined,
      );
    },
  };
};
