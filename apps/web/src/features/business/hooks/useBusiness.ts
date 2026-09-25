import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessBranchFormValues,
  FranchiseBusinessFormValues,
  OrganizationBusinessFormValues,
} from "@pos/validation";
import { authService } from "@/features/auth/services/auth.service";
import { activateMembershipContext } from "@/shared/auth/active-context";
import { useAuthStore } from "@/store/auth";
import { businessKeys } from "../query-keys";
import { businessHierarchyQuery } from "../query-options";
import { businessService } from "../services/business.service";

export const useBusinessHierarchy = () => useQuery(businessHierarchyQuery());

export const useRefreshBusiness = () => {
  const queryClient = useQueryClient();
  return async () => {
    const nextMemberships = await authService.memberships();
    const state = useAuthStore.getState();
    state.setContext({
      membershipId: state.membershipId,
      franchiseId: state.franchiseId,
      branchId: state.branchId,
      memberships: nextMemberships,
    });
    await queryClient.invalidateQueries({ queryKey: businessKeys.hierarchy() });
  };
};

export const useSaveOrganization = (organizationId?: string) =>
  useMutation({
    mutationFn: async (values: OrganizationBusinessFormValues) => {
      if (organizationId) {
        return businessService.updateOrganization(organizationId, values);
      }
      const created = await businessService.createOrganization(values);
      return created.organization;
    },
  });

export const useArchiveOrganization = (organizationId: string) =>
  useMutation({
    mutationFn: () => businessService.archiveOrganization(organizationId),
  });

export const useSaveFranchise = ({
  franchiseId,
  organizationId,
}: {
  franchiseId: string | undefined;
  organizationId: string;
}) =>
  useMutation({
    mutationFn: async (values: FranchiseBusinessFormValues) => {
      if (franchiseId)
        return businessService.updateFranchise(franchiseId, values);
      const created = await businessService.createFranchise(
        organizationId,
        values,
      );
      const memberships = await authService.memberships();
      const membership = memberships.find(
        (item) => item.membershipId === created.membershipId,
      );
      if (membership) {
        await activateMembershipContext(
          membership,
          memberships,
          organizationId,
        );
      }
      return created.tenant;
    },
  });

export const useArchiveFranchise = (franchiseId: string) =>
  useMutation({
    mutationFn: () => businessService.archiveFranchise(franchiseId),
  });

export const useSaveBranch = ({
  branchId,
  currency,
}: {
  branchId: string | undefined;
  currency: string;
}) =>
  useMutation({
    mutationFn: (values: BusinessBranchFormValues) =>
      branchId
        ? businessService.updateBranch(branchId, { ...values, currency })
        : businessService.createBranch({ ...values, currency }),
  });

export const useArchiveBranch = (branchId: string) =>
  useMutation({ mutationFn: () => businessService.archiveBranch(branchId) });
