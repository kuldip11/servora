import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifySuccess } from "@/shared/lib/notify";
import {
  modifierGroupsService,
  type ModifierGroupPayload,
} from "@/features/menu/services/modifier-groups.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useSaveModifierGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      existingId,
      payload,
    }: {
      existingId: string | null;
      payload: ModifierGroupPayload;
    }) => modifierGroupsService.save(existingId, payload),
    onSuccess: (_data, { existingId }) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.modifierGroups() });
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(
        existingId ? "Modifier group updated" : "Modifier group created",
      );
    },
  });
};
