import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useBulkUpdateTags = () => {
  return useMutation({
    mutationFn: ({
      itemIds,
      tagIds,
      mode,
    }: {
      itemIds: string[];
      tagIds: string[];
      mode: "add" | "remove" | "replace";
    }) => menuItemsService.bulkUpdateTags(itemIds, tagIds, mode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(`Updated tags on ${data.updated} item(s)`);
    },
    onError: (error) => notifyError(error, "Failed to update tags"),
  });
};
