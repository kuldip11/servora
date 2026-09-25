import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useBulkMoveCategory = () => {
  const queryClient = useQueryClient();
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
