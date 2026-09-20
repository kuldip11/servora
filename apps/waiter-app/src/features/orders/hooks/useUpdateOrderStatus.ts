import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { updateOrderStatus } from "@/features/orders/api/orders";
import { extractApiError } from "@pos/api-client";
import { orderKeys } from "@/features/orders/constants";

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      ...reason
    }: {
      id: string;
      status: string;
      cancellationReasonId?: string;
      reason?: string;
    }) => updateOrderStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      toast({ title: "Order updated", tone: "success" });
    },
    onError: (error) =>
      toast({
        title: extractApiError(error, "Failed to update order"),
        tone: "danger",
      }),
  });
};
