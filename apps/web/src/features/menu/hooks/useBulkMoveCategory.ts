import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useBulkMoveCategory = () => {
  return useMutation({
    mutationFn: ({
      itemIds,
      categoryId,
    }: {
      itemIds: string[];
      categoryId: string;
    }) => menuItemsService.bulkMoveCategory(itemIds, categoryId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(`Moved ${data.updated} item(s)`);
    },
    onError: (error) => notifyError(error, "Failed to move items"),
  });
};
