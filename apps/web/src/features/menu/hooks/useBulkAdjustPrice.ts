import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useBulkAdjustPrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemIds,
      priceChange,
      mode,
    }: {
      itemIds: string[];
      priceChange: number;
      mode: "set" | "increase" | "decrease";
    }) => menuItemsService.bulkAdjustPrice(itemIds, priceChange, mode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(`Repriced ${data.updated} item(s)`);
    },
    onError: (error) => notifyError(error, "Failed to update prices"),
  });
};
