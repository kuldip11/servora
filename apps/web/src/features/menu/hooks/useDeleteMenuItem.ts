import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuItemsService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess("Item deleted");
    },
    onError: (error) => notifyError(error, "Failed to delete item"),
  });
};
