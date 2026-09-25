import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useSetItemPublished = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      menuItemsService.setPublished(id, publish),
    onSuccess: (_data, { publish }) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(publish ? "Item published" : "Moved to draft");
    },
    onError: (err) => notifyError(err, "Failed to update publish state"),
  });
};
