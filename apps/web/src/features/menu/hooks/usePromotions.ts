import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import {
  promotionsQuery,
  promotionStatsQuery,
} from "@/features/menu/query-options";
import { menuPromotionsService } from "@/features/menu/services/menu-promotions.service";

export const usePromotions = () => useQuery(promotionsQuery());
export const usePromotionStats = (promotionId: string) =>
  useQuery(promotionStatsQuery(promotionId));

export const useSavePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: Record<string, unknown>;
    }) =>
      id
        ? menuPromotionsService.update(id, input)
        : menuPromotionsService.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.promotions() }),
  });
};

export const useTogglePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      menuPromotionsService.update(id, { isActive }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.promotions() }),
    onError: (error) => notifyError(error, "Failed to update promotion"),
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuPromotionsService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.promotions() }),
    onError: (error) => notifyError(error, "Failed to delete promotion"),
  });
};
