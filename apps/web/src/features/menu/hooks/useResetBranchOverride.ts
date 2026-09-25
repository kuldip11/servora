import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuBranchOverridesService } from "@/features/menu/services/menu-branch-overrides.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useResetBranchOverride = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) =>
      menuBranchOverridesService.reset(itemId, branchId),
    onSuccess: () => {
      notifySuccess("Reset to default");
      queryClient.invalidateQueries({
        queryKey: menuKeys.branchOverrides(itemId),
      });
    },
    onError: (error) => notifyError(error, "Failed to reset"),
  });
};
