import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { modifierGroupsService } from "@/features/menu/services/modifier-groups.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useDeleteModifierGroup = () => {
  return useMutation({
    mutationFn: (id: string) => modifierGroupsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.modifierGroups() });
      notifySuccess("Modifier group deleted");
    },
    onError: (error) =>
      notifyError(
        error,
        "Failed to delete — it may still be attached to items",
      ),
  });
};
