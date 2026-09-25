import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  billingService,
  type CollectPaymentInput,
} from "@/features/billing/services/billing.service";
import { billingKeys } from "@/features/billing/query-keys";
import { orderKeys } from "@/features/orders/query-keys";
import { tableKeys } from "@/features/tables/query-keys";

export const useCollectPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      input,
    }: {
      orderId: string;
      input: CollectPaymentInput;
    }) => billingService.collectPayment(orderId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.order(variables.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: orderKeys.detail(variables.orderId),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Payment recorded successfully");
    },
    onError: (err) => notifyError(err, "Payment failed"),
  });
};
