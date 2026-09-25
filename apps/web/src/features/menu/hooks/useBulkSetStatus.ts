import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";
import type { MenuItemStatus } from "@pos/types";

export const useBulkSetStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemIds,
      status,
      reason,
    }: {
      itemIds: string[];
      status: MenuItemStatus;
      reason?: string;
    }) => menuItemsService.bulkSetStatus(itemIds, status, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(`Updated status for ${data.updated} item(s)`);
    },
    onError: (error) => notifyError(error, "Failed to update status"),
  });
};
