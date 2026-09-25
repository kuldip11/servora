import { useQueryClient, useMutation } from "@tanstack/react-query";
import { billingService } from "@/features/billing/services/billing.service";
import { billingKeys } from "@/features/billing/query-keys";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

type SharedStrategy = "EVEN_SPLIT" | "MANUAL";

export const useSplitBillBySeat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      strategy,
    }: {
      orderId: string;
      strategy: SharedStrategy;
    }) => billingService.splitOrderBySeat(orderId, strategy),
    onSuccess: (result, variables) => {
      if (result.status === "MANUAL_REQUIRED") return;
      queryClient.invalidateQueries({
        queryKey: billingKeys.order(variables.orderId),
      });
      notifySuccess("Bill split by seat");
    },
    onError: (error) => notifyError(error, "Unable to split by seat"),
  });
};
