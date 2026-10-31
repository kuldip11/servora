import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { orderKeys } from "@/features/orders/query-keys";
import { ordersService } from "@/features/orders/services/orders.service";
import { tableKeys } from "@/features/tables/public/query-keys";

export const useMergeOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceOrderId,
      targetOrderId,
    }: {
      sourceOrderId: string;
      targetOrderId: string;
    }) => ordersService.mergeOrders(sourceOrderId, targetOrderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: orderKeys.details() });
      void queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Tables merged for billing");
    },
    onError: (error) => notifyError(error, "Unable to merge tables"),
  });
};
