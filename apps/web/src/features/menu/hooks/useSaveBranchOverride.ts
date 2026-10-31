import { menuMutationSync } from "@/features/menu/query-sync";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifySuccess } from "@/shared/lib/notify";
import {
  menuBranchOverridesService,
  type BranchOverrideFormInput,
} from "@/features/menu/services/menu-branch-overrides.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useSaveBranchOverride = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      sync: menuMutationSync(queryClient),
      editKey: menuKeys.branchOverrides(itemId),
    }),
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string;
      input: BranchOverrideFormInput;
    }) => menuBranchOverridesService.save(itemId, branchId, input),
    onSuccess: async (_result, variables, context) => {
      if (!context) return;
      notifySuccess("Branch override saved");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: context.editKey,
        }),
        context.sync.invalidate(variables.branchId),
      ]);
    },
  });
};
