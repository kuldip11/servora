import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { perCoverPriceRulesQuery } from "@/features/menu/query-options";
import { menuPricingService } from "@/features/menu/services/menu-pricing.service";

export const usePerCoverPriceRules = () => useQuery(perCoverPriceRulesQuery());

export const useSavePerCoverPriceRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tier,
      price,
    }: {
      tier: "" | "ADULT" | "CHILD";
      price: number;
    }) =>
      menuPricingService.create({
        isPerCover: true,
        coverTier: tier || null,
        price,
        priority: 0,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuKeys.perCoverPriceRules(),
      });
      notifySuccess("Per-cover rate saved");
    },
    onError: (error) => notifyError(error, "Failed to save per-cover rate"),
  });
};

export const useDeletePerCoverPriceRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuPricingService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.perCoverPriceRules(),
      }),
    onError: (error) => notifyError(error, "Failed to remove per-cover rate"),
  });
};
