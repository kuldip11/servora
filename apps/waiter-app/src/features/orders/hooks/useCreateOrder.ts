import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { extractApiError } from "@pos/api-client";
import {
  createOrder,
  type CreateOrderInput,
} from "@/features/orders/api/createOrder";
import { orderKeys } from "@/features/orders/constants";

const mutationErrorMessage = (error: unknown, fallback: string): string =>
  extractApiError(error, fallback);

export const useCreateOrder = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
      qc.invalidateQueries({ queryKey: ["tables"] });
      toast({ title: "Order placed!", tone: "success" });
    },
    onError: (err: unknown) =>
      toast({
        title: mutationErrorMessage(err, "Failed"),
        tone: "danger",
      }),
  });
};
