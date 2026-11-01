import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import {
  customerGroupsQuery,
  loyaltyCustomersQuery,
  loyaltyTiersQuery,
} from "@/features/menu/query-options";
import { menuLoyaltyService } from "@/features/menu/services/menu-loyalty.service";

export const useLoyaltyTiers = () => useQuery(loyaltyTiersQuery());
export const useLoyaltyCustomers = () => useQuery(loyaltyCustomersQuery());
export const useCustomerGroups = () => useQuery(customerGroupsQuery());

export const useCreateLoyaltyTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuLoyaltyService.createTier,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.loyaltyTiers() }),
  });
};

export const useRemoveLoyaltyTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuLoyaltyService.removeTier,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.loyaltyTiers() }),
    onError: (error) => notifyError(error, "Failed to delete loyalty tier"),
  });
};

export const useCreateLoyaltyCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuLoyaltyService.createCustomer,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.loyaltyCustomers() }),
  });
};

export const useAssignLoyaltyTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      loyaltyTierId,
    }: {
      id: string;
      loyaltyTierId: string | null;
    }) => menuLoyaltyService.assignTier(id, loyaltyTierId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.loyaltyCustomers() }),
    onError: (error) =>
      notifyError(error, "Failed to update customer loyalty tier"),
  });
};

export const useSaveCustomerGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      editingId,
    }: {
      input: {
        name: string;
        discountPercent: number | null;
        discountFixed: number | null;
      };
      editingId: string | null;
    }) =>
      editingId
        ? menuLoyaltyService.updateGroup(editingId, input)
        : menuLoyaltyService.createGroup(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuKeys.customerGroups(),
      });
      notifySuccess("Customer group saved");
    },
  });
};

export const useDeleteCustomerGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuLoyaltyService.deleteGroup,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.customerGroups() }),
    onError: (error) => notifyError(error, "Failed to delete customer group"),
  });
};
