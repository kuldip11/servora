import { voidDomainRequest } from "./shared";
import type { Branch } from "@pos/types";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export interface BranchInput {
  name: string;
  code: string;
  timezone: string;
  currency: string;
  address?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string;
  managerName?: string | null;
  email?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  weeklyOperatingDays?: string[] | null;
  taxOverride?: number | null;
  serviceChargeOverride?: number | null;
  invoicePrefix?: string | null;
  receiptFooter?: string | null;
  inventoryTrackingEnabled?: boolean;
  negativeStockPolicy?: "BLOCK" | "ALLOW" | "WARN";
  dineInEnabled: boolean;
  takeawayEnabled: boolean;
  deliveryEnabled: boolean;
  onlineEnabled: boolean;
  tablesEnabled: boolean;
  customerQrEnabled?: boolean;
  kdsEnabled?: boolean;
  waiterAppEnabled?: boolean;
  isActive?: boolean;
}

export const createBranchesApi = (client: DomainHttpClient) => {
  return {
    list(signal?: AbortSignal): Promise<Branch[]> {
      return getDomainData<Branch[]>(
        client,
        "/branches",
        signal ? { signal } : undefined,
      );
    },
    create(input: BranchInput): Promise<Branch> {
      return postDomainData<Branch>(client, "/branches", input);
    },
    update(id: string, input: Partial<BranchInput>): Promise<Branch> {
      return patchDomainData<Branch>(client, `/branches/${id}`, input);
    },
    deactivate(id: string): Promise<void> {
      return voidDomainRequest(client.delete(`/branches/${id}`));
    },
  };
};
