import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifySuccess } from "@/shared/lib/notify";
import {
  menuBranchOverridesService,
  type BranchOverrideFormInput,
} from "@/features/menu/services/menu-branch-overrides.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useSaveBranchOverride = (itemId: string) => {
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
