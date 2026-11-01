import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { itemPriceRulesQuery } from "@/features/menu/query-options";
import { menuPricingService } from "@/features/menu/services/menu-pricing.service";

export const useItemPriceRules = (itemId: string) =>
  useQuery(itemPriceRulesQuery(itemId));

export const useCreateItemPriceRule = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuPricingService.create,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.itemPriceRules(itemId),
      }),
  });
};

export const useRemoveItemPriceRule = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuPricingService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.itemPriceRules(itemId),
      }),
    onError: (error) => notifyError(error, "Could not remove price rule"),
  });
};
