import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { modifierGroupsService } from "@/features/menu/services/modifier-groups.service";

export const useSaveVariantModifierPricing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      patch,
    }: {
      groupId: string;
      patch: Record<string, unknown>;
    }) => modifierGroupsService.update(groupId, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: menuKeys.modifierGroups(),
      });
      notifySuccess("Variant modifier prices saved");
    },
    onError: (error) =>
      notifyError(error, "Failed to save variant modifier prices"),
  });
};
