import type { AxiosRequestConfig } from "axios";
import type {
  AuthTokenResponse,
  AuthUserResponse,
  AvailableTenantResponse,
  ChangePasswordRequest,
  LoginRequest,
  MembershipSummaryResponse,
  OrganizationCreatedResponse,
  OrganizationResponse,
  SignupRequest,
  TenantCreatedResponse,
  TenantResponse,
  UpdateProfileRequest,
  UpdateTenantRequest,
} from "@pos/contracts";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  voidDomainRequest,
  type DomainHttpClient,
} from "./shared";

export type AuthResponse = AuthTokenResponse;
export type AuthUserDto = AuthUserResponse;
export type AvailableMembershipDto = MembershipSummaryResponse;
export type OrganizationDto = OrganizationResponse;
export type TenantDto = TenantResponse;
export type AvailableTenantDto = AvailableTenantResponse;
export type SignupInput = SignupRequest;
export type LoginInput = LoginRequest;
export type TenantSummary = TenantResponse;
export type UpdateTenantInput = UpdateTenantRequest;

export const createAuthApi = (client: DomainHttpClient) => {
  return {
    signup(input: SignupInput): Promise<{ user: AuthUserDto }> {
      return postDomainData<{ user: AuthUserDto }>(
        client,
        "/auth/signup",
        input,
      );
    },
    login(input: LoginInput): Promise<AuthResponse> {
      return postDomainData<AuthResponse>(client, "/auth/login", input);
    },
    refresh(config?: AxiosRequestConfig): Promise<AuthResponse> {
      return postDomainData<AuthResponse>(
        client,
        "/auth/refresh",
        undefined,
        config,
      );
    },
    logout(): Promise<{ loggedOut: boolean }> {
      return postDomainData<{ loggedOut: boolean }>(client, "/auth/logout");
    },
    memberships(): Promise<AvailableMembershipDto[]> {
      return getDomainData<AvailableMembershipDto[]>(
        client,
        "/auth/memberships",
      );
    },
    organizations(): Promise<OrganizationDto[]> {
      return getDomainData<OrganizationDto[]>(client, "/organizations");
    },
    createOrganization(
      input: string | Record<string, unknown>,
    ): Promise<OrganizationCreatedResponse> {
      return postDomainData<OrganizationCreatedResponse>(
        client,
        "/organizations",
        typeof input === "string" ? { name: input } : input,
      );
    },
    createTenant(
      input: string | Record<string, unknown>,
      organizationId?: string,
    ): Promise<TenantCreatedResponse> {
      return postDomainData<TenantCreatedResponse>(
        client,
        "/tenants",
        typeof input === "string" ? { name: input, organizationId } : input,
      );
    },
    updateTenant(
      tenantId: string,
      input: UpdateTenantRequest,
    ): Promise<TenantDto> {
      return patchDomainData<TenantDto>(client, `/tenants/${tenantId}`, input);
    },
    archiveTenant(tenantId: string): Promise<void> {
      return voidDomainRequest(client.delete(`/tenants/${tenantId}`));
    },
    me(): Promise<AuthUserDto> {
      return getDomainData<AuthUserDto>(client, "/auth/me");
    },
    updateProfile(input: UpdateProfileRequest): Promise<AuthUserDto> {
      return patchDomainData<AuthUserDto>(client, "/auth/me", input);
    },
    changePassword(
      input: ChangePasswordRequest,
    ): Promise<{ changed: boolean }> {
      return postDomainData<{ changed: boolean }>(
        client,
        "/auth/me/change-password",
        input,
      );
    },
    listTenants(): Promise<AvailableTenantDto[]> {
      return getDomainData<AvailableTenantDto[]>(client, "/tenants");
    },
  };
};
