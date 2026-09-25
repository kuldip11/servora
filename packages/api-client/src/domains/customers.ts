import { voidDomainRequest } from "./shared";
import type { CustomerGroup, LoyaltyCustomer } from "@pos/types";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export interface CreateLoyaltyCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  loyaltyTierId?: string;
}

export interface CustomerGroupInput {
  name: string;
  discountPercent?: number | null;
  discountFixed?: number | null;
}

export const createCustomersApi = (client: DomainHttpClient) => {
  return {
    list(): Promise<LoyaltyCustomer[]> {
      return getDomainData<LoyaltyCustomer[]>(client, "/loyalty/customers");
    },
    search(signal?: AbortSignal): Promise<LoyaltyCustomer[]> {
      return getDomainData<LoyaltyCustomer[]>(
        client,
        "/loyalty/customers",
        signal ? { signal } : undefined,
      );
    },
    create(input: CreateLoyaltyCustomerInput): Promise<LoyaltyCustomer> {
      return postDomainData<LoyaltyCustomer>(
        client,
        "/loyalty/customers",
        input,
      );
    },
    assignTier(
      id: string,
      loyaltyTierId: string | null,
    ): Promise<LoyaltyCustomer> {
      return patchDomainData<LoyaltyCustomer>(
        client,
        `/loyalty/customers/${id}`,
        { loyaltyTierId },
      );
    },
    listGroups(signal?: AbortSignal): Promise<CustomerGroup[]> {
      return getDomainData<CustomerGroup[]>(
        client,
        "/customer-groups",
        signal ? { signal } : undefined,
      );
    },
    createGroup(input: CustomerGroupInput): Promise<CustomerGroup> {
      return postDomainData<CustomerGroup>(client, "/customer-groups", input);
    },
    updateGroup(id: string, input: CustomerGroupInput): Promise<CustomerGroup> {
      return patchDomainData<CustomerGroup>(
        client,
        `/customer-groups/${id}`,
        input,
      );
    },
    deleteGroup(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/customer-groups/${id}`));
    },
    resolveRequest(id: string): Promise<void> {
      return voidDomainRequest(
        client.patch(`/customer/requests/${id}`, { status: "RESOLVED" }),
      );
    },
    listRequests<T>(signal?: AbortSignal): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        "/customer/requests",
        signal ? { signal } : undefined,
      );
    },
  };
};
