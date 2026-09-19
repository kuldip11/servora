import { useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { menuTemplatesService } from "@/features/menu/services/menu-templates.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { queryClient } from "@/shared/lib/query-client";

export const useDeleteTemplate = () =>
  useMutation({
    mutationFn: (id: string) => menuTemplatesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.templates() });
      notifySuccess("Template deleted");
    },
    onError: (error) => notifyError(error, "Failed to delete template"),
  });
