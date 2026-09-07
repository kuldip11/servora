import {
  createBranchesApi,
  createOrganizationsApi,
  type BranchInput,
} from "@pos/api-client";
import type { Branch, OrganizationSummary, Tenant } from "@pos/types";
import type {
  BusinessBranchFormValues,
  FranchiseBusinessFormValues,
  OrganizationBusinessFormValues,
} from "@pos/validation";
import { apiClient } from "@/shared/lib/api-client";
import { authService } from "@/features/auth/services/auth.service";

const organizationsApi = createOrganizationsApi(apiClient);
const branchesApi = createBranchesApi(apiClient);

const normalizeOptionalStrings = <T extends Record<string, unknown>>(
  input: T,
) =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" && !value.trim() ? null : value,
    ]),
  );

export const businessService = {
  organizations: () => organizationsApi.list<OrganizationSummary>(),
  franchises: (organizationId: string) =>
    organizationsApi.tenants<Tenant>(organizationId),
  branches: () => branchesApi.list(),
  createOrganization: (input: OrganizationBusinessFormValues) =>
    organizationsApi.create<{
      organization: OrganizationSummary;
      membershipId: string;
    }>(normalizeOptionalStrings(input)),
  updateOrganization: (id: string, input: OrganizationBusinessFormValues) =>
    organizationsApi.update<OrganizationSummary>(
      id,
      normalizeOptionalStrings(input),
    ),
  archiveOrganization: (id: string) => organizationsApi.archive(id),
  createFranchise: (
    organizationId: string,
    input: FranchiseBusinessFormValues,
  ) =>
    authService.createTenant({
      ...normalizeOptionalStrings(input),
      organizationId,
    }),
  updateFranchise: (id: string, input: FranchiseBusinessFormValues) =>
    authService.updateTenant<Tenant>(id, normalizeOptionalStrings(input)),
  archiveFranchise: (id: string) => authService.archiveTenant(id),
  createBranch: (input: BusinessBranchFormValues & { currency: string }) =>
    branchesApi.create({
      ...normalizeOptionalStrings(input),
      address: input.addressLine1,
      onlineEnabled: input.customerQrEnabled,
      isActive: input.status === "ACTIVE",
      phone: input.phone,
    } as BranchInput),
  updateBranch: (
    id: string,
    input: BusinessBranchFormValues & { currency: string },
  ) =>
    branchesApi.update(id, {
      ...normalizeOptionalStrings(input),
      address: input.addressLine1,
      onlineEnabled: input.customerQrEnabled,
      isActive: input.status === "ACTIVE",
      phone: input.phone,
    } as Partial<BranchInput>),
  archiveBranch: (id: string) => branchesApi.deactivate(id),
};

export type BusinessHierarchy = Array<{
  organization: OrganizationSummary;
  franchises: Array<{ franchise: Tenant; branches: Branch[] }>;
}>;
