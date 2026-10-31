import { voidDomainRequest } from "./shared";
import type {
  CreateOrganizationRequest,
  LoyaltyTierRequest,
  LoyaltyTierResponse,
  OrganizationCreatedResponse,
  OrganizationMenuRequest,
  OrganizationMenuResponse,
  OrganizationResponse,
  TenantResponse,
  UpdateOrganizationMenuRequest,
  UpdateOrganizationRequest,
} from "@pos/contracts";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  type DomainHttpClient,
} from "./shared";

export type CreateOrganizationInput = CreateOrganizationRequest;
export type UpdateOrganizationInput = UpdateOrganizationRequest;
export type CreateOrganizationMenuInput = OrganizationMenuRequest;
export type UpdateOrganizationMenuInput = UpdateOrganizationMenuRequest;
export type CreateOrganizationLoyaltyTierInput = LoyaltyTierRequest;

export const createOrganizationsApi = (client: DomainHttpClient) => {
  return {
    list(): Promise<OrganizationResponse[]> {
      return getDomainData<OrganizationResponse[]>(client, "/organizations");
    },
    tenants(organizationId: string): Promise<TenantResponse[]> {
      return getDomainData<TenantResponse[]>(
        client,
        `/organizations/${organizationId}/tenants`,
      );
    },
    create(
      input: CreateOrganizationRequest,
    ): Promise<OrganizationCreatedResponse> {
      return postDomainData<OrganizationCreatedResponse>(
        client,
        "/organizations",
        input,
      );
    },
    update(
      organizationId: string,
      input: UpdateOrganizationRequest,
    ): Promise<OrganizationResponse> {
      return patchDomainData<OrganizationResponse>(
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
    menus(organizationId: string): Promise<OrganizationMenuResponse[]> {
      return getDomainData<OrganizationMenuResponse[]>(
        client,
        `/organizations/${organizationId}/menus`,
      );
    },
    createMenu(
      organizationId: string,
      input: OrganizationMenuRequest,
    ): Promise<OrganizationMenuResponse> {
      return postDomainData<OrganizationMenuResponse>(
        client,
        `/organizations/${organizationId}/menus`,
        input,
      );
    },
    updateMenu(
      organizationId: string,
      menuId: string,
      patch: UpdateOrganizationMenuRequest,
    ): Promise<OrganizationMenuResponse> {
      return patchDomainData<OrganizationMenuResponse>(
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
    loyaltyTiers(organizationId: string): Promise<LoyaltyTierResponse[]> {
      return getDomainData<LoyaltyTierResponse[]>(
        client,
        `/organizations/${organizationId}/loyalty-tiers`,
      );
    },
    createLoyaltyTier(
      organizationId: string,
      input: LoyaltyTierRequest,
    ): Promise<LoyaltyTierResponse> {
      return postDomainData<LoyaltyTierResponse>(
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
