import type {
  AvailableMembership,
  OrganizationSummary,
  Tenant,
  User,
} from "@pos/types";
import {
  getDomainData,
  patchDomainData,
  postDomainData,
  voidDomainRequest,
  type DomainHttpClient,
} from "./shared";

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface TenantSummary {
  id: string;
  name: string;
}

export const createAuthApi = (client: DomainHttpClient) => {
  return {
    signup(input: SignupInput): Promise<{ user: User }> {
      return postDomainData<{ user: User }>(client, "/auth/signup", input);
    },
    login(input: LoginInput): Promise<AuthResponse> {
      return postDomainData<AuthResponse>(client, "/auth/login", input);
    },
    refresh(): Promise<AuthResponse> {
      return postDomainData<AuthResponse>(client, "/auth/refresh");
    },
    logout(): Promise<{ loggedOut: boolean }> {
      return postDomainData<{ loggedOut: boolean }>(client, "/auth/logout");
    },
    memberships(): Promise<AvailableMembership[]> {
      return getDomainData<AvailableMembership[]>(client, "/auth/memberships");
    },
    organizations(): Promise<OrganizationSummary[]> {
      return getDomainData<OrganizationSummary[]>(client, "/organizations");
    },
    createOrganization(
      input: string | Record<string, unknown>,
    ): Promise<{ organization: OrganizationSummary; membershipId: string }> {
      return postDomainData(
        client,
        "/organizations",
        typeof input === "string" ? { name: input } : input,
      );
    },
    createTenant(
      input: string | Record<string, unknown>,
      organizationId?: string,
    ): Promise<{ tenant: TenantSummary; membershipId: string }> {
      return postDomainData(
        client,
        "/tenants",
        typeof input === "string" ? { name: input, organizationId } : input,
      );
    },
    updateTenant<T>(
      tenantId: string,
      input: Record<string, unknown>,
    ): Promise<T> {
      return patchDomainData<T>(client, `/tenants/${tenantId}`, input);
    },
    archiveTenant(tenantId: string): Promise<void> {
      return voidDomainRequest(client.delete(`/tenants/${tenantId}`));
    },
    me(): Promise<User> {
      return getDomainData<User>(client, "/auth/me");
    },
    updateProfile(input: {
      firstName?: string;
      lastName?: string;
      displayName?: string | null;
      phone?: string | null;
      profileImageUrl?: string | null;
    }): Promise<User> {
      return patchDomainData<User>(client, "/auth/me", input);
    },
    changePassword(input: {
      currentPassword: string;
      newPassword: string;
    }): Promise<{ changed: boolean }> {
      return postDomainData<{ changed: boolean }>(
        client,
        "/auth/me/change-password",
        input,
      );
    },
    listTenants(): Promise<Array<{ tenant: Tenant }>> {
      return getDomainData<Array<{ tenant: Tenant }>>(client, "/tenants");
    },
  };
};
