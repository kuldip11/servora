import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { ordersService } from "@/features/orders/services/orders.service";
import { orderKeys } from "@/features/orders/query-keys";
import { tableKeys } from "@/features/tables/query-keys";

export const useUpdateOrderStatus = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input:
        | string
        | { status: string; cancellationReasonId?: string; reason?: string },
    ) => {
      if (typeof input === "string")
        return ordersService.updateStatus(orderId, input);
      const { status, ...reason } = input;
      return ordersService.updateStatus(orderId, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Order status updated");
    },
    onError: (err) => notifyError(err, "Failed to update status"),
  });
};
