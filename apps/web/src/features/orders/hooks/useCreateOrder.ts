import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  ordersService,
  type CreateOrderInput,
} from "@/features/orders/services/orders.service";
import { orderKeys } from "@/features/orders/query-keys";
import { tableKeys } from "@/features/tables/query-keys";

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Order created successfully!");
    },
    onError: (err) => notifyError(err, "Failed to create order"),
  });
};
