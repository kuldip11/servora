import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useBulkDeleteItems = () => {
  return useMutation({
    mutationFn: (itemIds: string[]) => menuItemsService.bulkDelete(itemIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(
        data.protected > 0
          ? `Deleted ${data.deleted} item(s) — ${data.protected} skipped (on open orders)`
          : `Deleted ${data.deleted} item(s)`,
      );
    },
    onError: (error) => notifyError(error, "Failed to delete items"),
  });
};
