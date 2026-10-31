import { menuMutationSync } from "@/features/menu/query-sync";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuBranchOverridesService } from "@/features/menu/services/menu-branch-overrides.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useResetBranchOverride = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      sync: menuMutationSync(queryClient),
      editKey: menuKeys.branchOverrides(itemId),
    }),
    mutationFn: (branchId: string) =>
      menuBranchOverridesService.reset(itemId, branchId),
    onSuccess: async (_result, variables, context) => {
      if (!context) return;
      notifySuccess("Reset to default");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: context.editKey,
        }),
        context.sync.invalidate(variables),
      ]);
    },
    onError: (error) => notifyError(error, "Failed to reset"),
  });
};
