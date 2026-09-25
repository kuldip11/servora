import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { menuTemplatesService } from "@/features/menu/services/menu-templates.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuTemplatesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.templates() });
      notifySuccess("Template deleted");
    },
    onError: (error) => notifyError(error, "Failed to delete template"),
  });
};
