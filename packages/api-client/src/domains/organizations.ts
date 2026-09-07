import { voidDomainRequest } from "./shared";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export const createOrganizationsApi = (client: DomainHttpClient) => {
  return {
    list<T>(): Promise<T[]> {
      return getDomainData<T[]>(client, "/organizations");
    },
    tenants<T>(organizationId: string): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        `/organizations/${organizationId}/tenants`,
      );
    },
    create<T>(input: Record<string, unknown>): Promise<T> {
      return postDomainData<T>(client, "/organizations", input);
    },
    update<T>(
      organizationId: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return patchDomainData<T>(
        client,
        `/organizations/${organizationId}`,
        input,
      );
    },
    archive(organizationId: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/organizations/${organizationId}`),
      );
    },
    menus<T>(organizationId: string): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        `/organizations/${organizationId}/menus`,
      );
    },
    createMenu<T>(
      organizationId: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return postDomainData<T>(
        client,
        `/organizations/${organizationId}/menus`,
        input,
      );
    },
    updateMenu<T>(
      organizationId: string,
      menuId: string,
      patch: Record<string, unknown>,
    ): Promise<T> {
      return patchDomainData<T>(
        client,
        `/organizations/${organizationId}/menus/${menuId}`,
        patch,
      );
    },
    removeMenu(organizationId: string, menuId: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/organizations/${organizationId}/menus/${menuId}`),
      );
    },
    loyaltyTiers<T>(organizationId: string): Promise<T[]> {
      return getDomainData<T[]>(
        client,
        `/organizations/${organizationId}/loyalty-tiers`,
      );
    },
    createLoyaltyTier<T>(
      organizationId: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return postDomainData<T>(
        client,
        `/organizations/${organizationId}/loyalty-tiers`,
        input,
      );
    },
    removeLoyaltyTier(organizationId: string, id: string): Promise<void> {
      return voidDomainRequest(
        client.delete(`/organizations/${organizationId}/loyalty-tiers/${id}`),
      );
    },
  };
};
