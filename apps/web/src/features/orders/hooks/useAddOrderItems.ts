import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  ordersService,
  type AddOrderItemsInput,
} from "@/features/orders/services/orders.service";
import { orderKeys } from "@/features/orders/query-keys";

export const useAddOrderItems = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddOrderItemsInput) =>
      ordersService.addItems(orderId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      notifySuccess("Items added to order");
    },
    onError: (err) => notifyError(err, "Failed to add items"),
  });
};
