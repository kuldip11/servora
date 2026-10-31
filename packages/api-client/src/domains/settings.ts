import {
  getDomainData,
  patchDomainData,
  type DomainHttpClient,
} from "./shared";

export const createSettingsApi = (client: DomainHttpClient) => {
  return {
    tenants(signal?: AbortSignal): Promise<AvailableTenantResponse[]> {
      return getDomainData<AvailableTenantResponse[]>(
        client,
        "/tenants",
        signal ? { signal } : undefined,
      );
    },
    updateTenant(
      tenantId: string,
      patch: UpdateTenantRequest,
    ): Promise<TenantResponse> {
      return patchDomainData<TenantResponse>(
        client,
        `/tenants/${tenantId}`,
        patch,
      );
    },
  };
};
import type {
  AvailableTenantResponse,
  TenantResponse,
  UpdateTenantRequest,
} from "@pos/contracts";
