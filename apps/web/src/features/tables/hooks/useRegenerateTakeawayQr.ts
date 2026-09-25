import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { tablesService } from "@/features/tables/services/tables.service";
import { tableKeys } from "@/features/tables/query-keys";

export const useRegenerateTakeawayQr = (
  branchId: string | null | undefined,
) => {
  const queryClient = useQueryClient();
  const validBranchId = branchId && branchId !== "all" ? branchId : "";

  return useMutation({
    mutationFn: () => {
      if (!validBranchId) {
        throw new Error("A branch is required to regenerate the takeaway QR");
      }
      return tablesService.regenerateTakeawayQr(validBranchId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(tableKeys.takeawayQr(validBranchId), data);
      notifySuccess("Takeaway QR code regenerated");
    },
    onError: (error) => notifyError(error, "Unable to regenerate takeaway QR"),
  });
};
