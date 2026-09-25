import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { toApiClientError } from "@/shared/lib/api-client";
import { ordersService } from "@/features/orders/services/orders.service";
import { orderKeys } from "@/features/orders/query-keys";

export const useCompOrderItem = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...reason
    }: {
      itemId: string;
      cancellationReasonId?: string;
      reason?: string;
      approvalToken?: string;
    }) => ordersService.compItem(orderId, itemId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      notifySuccess("Item comped");
    },
    onError: (error) => {
      if (toApiClientError(error).code === "MANAGER_APPROVAL_REQUIRED") return;
      notifyError(error, "Failed to comp item");
    },
  });
};
