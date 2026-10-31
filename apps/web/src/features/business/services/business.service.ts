import {
  createBranchesApi,
  createOrganizationsApi,
  type BranchDto,
  type BranchInput,
  type CreateOrganizationInput,
  type TenantDto,
  type UpdateOrganizationInput,
  type UpdateTenantInput,
} from "@pos/api-client";
import type { OrganizationSummary } from "@pos/types";
import type {
  BusinessBranchFormValues,
  FranchiseBusinessFormValues,
  OrganizationBusinessFormValues,
} from "@pos/validation";
import { apiClient } from "@/shared/lib/api-client";
import { authService } from "@/shared/auth/auth.service";

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
  ) as T;

const toBranchInput = (
  values: BusinessBranchFormValues & { currency: string },
): BranchInput => {
  const { status: _status, phone, ...input } = values;
  return Object.fromEntries(
    Object.entries({
      ...normalizeOptionalStrings(input),
      address: values.addressLine1,
      onlineEnabled: values.customerQrEnabled,
      ...(phone ? { phone } : {}),
    }).filter(([, value]) => value !== undefined),
  ) as BranchInput;
};

const toTenantUpdateInput = (
  input: FranchiseBusinessFormValues,
): UpdateTenantInput =>
  Object.fromEntries(
    Object.entries(normalizeOptionalStrings(input)).filter(
      ([, value]) => value !== undefined,
    ),
  ) as UpdateTenantInput;

const toOrganizationInput = (
  input: OrganizationBusinessFormValues,
): CreateOrganizationInput =>
  Object.fromEntries(
    Object.entries(normalizeOptionalStrings(input)).filter(
      ([, value]) => value !== undefined,
    ),
  ) as CreateOrganizationInput;

export const businessService = {
  organizations: () => organizationsApi.list(),
  franchises: (organizationId: string) =>
    organizationsApi.tenants(organizationId),
  branches: () => branchesApi.list(),
  createOrganization: (input: OrganizationBusinessFormValues) =>
    organizationsApi.create(toOrganizationInput(input)),
  updateOrganization: (id: string, input: OrganizationBusinessFormValues) =>
    organizationsApi.update(
      id,
      toOrganizationInput(input) satisfies UpdateOrganizationInput,
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
    authService.updateTenant(id, toTenantUpdateInput(input)),
  archiveFranchise: (id: string) => authService.archiveTenant(id),
  createBranch: async (
    input: BusinessBranchFormValues & { currency: string },
  ) => {
    const created = await branchesApi.create(toBranchInput(input));
    if (input.status === "INACTIVE") {
      await branchesApi.deactivate(created.id);
      return { ...created, isActive: false };
    }
    return created;
  },
  updateBranch: async (
    id: string,
    input: BusinessBranchFormValues & { currency: string },
  ) => {
    const updated = await branchesApi.update(id, toBranchInput(input));
    if (input.status === "INACTIVE") {
      await branchesApi.deactivate(id);
      return { ...updated, isActive: false };
    }
    return updated;
  },
  archiveBranch: (id: string) => branchesApi.deactivate(id),
};

export type BusinessHierarchy = Array<{
  organization: OrganizationSummary;
  franchises: Array<{ franchise: TenantDto; branches: BranchDto[] }>;
}>;
