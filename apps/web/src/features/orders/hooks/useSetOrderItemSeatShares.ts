import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { orderKeys } from "@/features/orders/query-keys";
import { ordersService } from "@/features/orders/services/orders.service";

export const useSetOrderItemSeatShares = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      shares,
    }: {
      itemId: string;
      shares: Array<{ seatLabel: string; shareRatio: number }>;
    }) => ordersService.setItemSeatShares(orderId, itemId, shares),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orderKeys.detail(orderId),
      });
      notifySuccess("Shared item allocation saved");
    },
    onError: (error) =>
      notifyError(error, "Failed to save shared item allocation"),
  });
};
