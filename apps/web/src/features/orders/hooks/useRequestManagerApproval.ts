import { useMutation } from "@tanstack/react-query";
import { approvalsService } from "@/features/orders/services/approvals.service";

export const useRequestManagerApproval = () => {
  return useMutation({
    mutationFn: approvalsService.requestManagerApproval,
  });
};
