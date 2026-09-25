import { useQueryClient, useMutation } from "@tanstack/react-query";
import type { BillItemAllocation } from "@pos/api-client";
import { billingService } from "@/features/billing/services/billing.service";
import { billingKeys } from "@/features/billing/query-keys";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

type SplitBillInput = {
  orderId: string;
  splitWays: number;
  allocations?: BillItemAllocation[];
};

export const useSplitBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, splitWays, allocations }: SplitBillInput) =>
      allocations
        ? billingService.splitOrderByItems(orderId, allocations)
        : billingService.splitOrder(orderId, splitWays),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.order(variables.orderId),
      });
      notifySuccess("Bill split successfully");
    },
    onError: (error) => notifyError(error, "Unable to split bill"),
  });
};
