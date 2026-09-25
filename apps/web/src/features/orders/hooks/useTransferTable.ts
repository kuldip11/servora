import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { tableKeys } from "@/features/tables/query-keys";
import { orderKeys } from "@/features/orders/query-keys";
import { ordersService } from "@/features/orders/services/orders.service";

export const useTransferTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      newTableId,
      reason,
    }: {
      orderId: string;
      newTableId: string;
      reason?: string;
    }) => ordersService.transferTable(orderId, newTableId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.details() });
      notifySuccess("Table transferred");
    },
    onError: (error) => notifyError(error, "Failed to transfer table"),
  });
};
