import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { menuTagsService } from "@/features/menu/services/menu-tags.service";
import { notifyError } from "@/shared/lib/notify";

export const useDeleteMenuTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuTagsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.tags() });
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    },
    onError: (error) => notifyError(error, "Failed to delete tag"),
  });
};
