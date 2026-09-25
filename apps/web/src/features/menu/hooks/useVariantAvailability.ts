import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";

export const useUpdateVariantAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, unavailable }: { id: string; unavailable: boolean }) =>
      menuItemsService.updateVariantAvailability(id, unavailable),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() }),
  });
};

export const useSetVariantStockCount = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      variantId,
      count,
    }: {
      variantId: string;
      count: number | null;
    }) => menuItemsService.setManualStockCount(itemId, count, variantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess("Variant stock count updated");
    },
    onError: (error) =>
      notifyError(error, "Failed to update variant stock count"),
  });
};
