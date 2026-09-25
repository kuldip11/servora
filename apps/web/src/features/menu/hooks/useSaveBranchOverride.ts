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
    mutationFn: ({
      branchId,
      input,
    }: {
      branchId: string;
      input: BranchOverrideFormInput;
    }) => menuBranchOverridesService.save(itemId, branchId, input),
    onSuccess: () => {
      notifySuccess("Branch override saved");
      queryClient.invalidateQueries({
        queryKey: menuKeys.branchOverrides(itemId),
      });
    },
  });
};
