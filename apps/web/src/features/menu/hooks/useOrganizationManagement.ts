import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { organizationManagementService } from "@/features/menu/services/organization-management.service";

export const useManagedOrganizations = (enabled: boolean) =>
  useQuery({
    queryKey: menuKeys.organizations(),
    queryFn: organizationManagementService.listOrganizations,
    enabled,
  });

export const useOrganizationTenants = (
  organizationId: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: menuKeys.organizationTenants(organizationId),
    queryFn: () => organizationManagementService.listTenants(organizationId),
    enabled: Boolean(organizationId) && enabled,
  });

export const useOrganizationMenus = (
  organizationId: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: menuKeys.organizationMenus(organizationId),
    queryFn: () => organizationManagementService.listMenus(organizationId),
    enabled: Boolean(organizationId) && enabled,
  });

export const useOrganizationPriceRules = (
  organizationId: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: menuKeys.organizationPriceRules(organizationId),
    queryFn: () => organizationManagementService.listPriceRules(organizationId),
    enabled: Boolean(organizationId) && enabled,
  });

export const useOrganizationLoyaltyTiers = (
  organizationId: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: menuKeys.organizationLoyaltyTiers(organizationId),
    queryFn: () =>
      organizationManagementService.listLoyaltyTiers(organizationId),
    enabled: Boolean(organizationId) && enabled,
  });

export const useCreateOrganizationMenu = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationManagementService.createMenu.bind(
      null,
      organizationId,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuKeys.organizationMenus(organizationId),
      });
      notifySuccess("Organization menu created");
    },
    onError: (error) =>
      notifyError(error, "Failed to create organization menu"),
  });
};

export const useUpdateOrganizationMenu = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      menuId,
      status,
    }: {
      menuId: string;
      status: "DRAFT" | "PUBLISHED";
    }) =>
      organizationManagementService.updateMenu(organizationId, menuId, {
        status,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.organizationMenus(organizationId),
      }),
    onError: (error) =>
      notifyError(error, "Failed to update organization menu"),
  });
};

export const useDeleteOrganizationMenu = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuId: string) =>
      organizationManagementService.removeMenu(organizationId, menuId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.organizationMenus(organizationId),
      }),
    onError: (error) =>
      notifyError(error, "Failed to delete organization menu"),
  });
};

export const useCreateOrganizationPriceRule = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      menuItemSku,
      price,
    }: {
      menuItemSku: string;
      price: number;
    }) =>
      organizationManagementService.createPriceRule(
        organizationId,
        menuItemSku,
        price,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuKeys.organizationPriceRules(organizationId),
      });
      notifySuccess("Organization price rule created");
    },
    onError: (error) =>
      notifyError(error, "Failed to create organization price rule"),
  });
};

export const useDeleteOrganizationPriceRule = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationManagementService.removePriceRule,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.organizationPriceRules(organizationId),
      }),
    onError: (error) =>
      notifyError(error, "Failed to remove organization price rule"),
  });
};

export const useCreateOrganizationLoyaltyTier = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      discountPercent?: number;
      discountFixed?: number;
    }) =>
      organizationManagementService.createLoyaltyTier(organizationId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuKeys.organizationLoyaltyTiers(organizationId),
      });
      notifySuccess("Organization loyalty tier created");
    },
    onError: (error) =>
      notifyError(error, "Failed to create organization loyalty tier"),
  });
};

export const useDeleteOrganizationLoyaltyTier = (organizationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      organizationManagementService.removeLoyaltyTier(organizationId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.organizationLoyaltyTiers(organizationId),
      }),
    onError: (error) =>
      notifyError(error, "Failed to remove organization loyalty tier"),
  });
};
