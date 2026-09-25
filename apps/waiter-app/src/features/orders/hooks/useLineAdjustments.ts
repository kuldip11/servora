import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { extractApiError, toApiClientError } from "@pos/api-client";
import { compOrderItem, voidOrderItem } from "@/features/orders/api/orders";
import { orderKeys } from "@/features/orders/constants";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export const useLineAdjustments = (orderId: string) => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();
  const mutation = useMutation({
    mutationFn: ({
      itemId,
      action,
      ...reason
    }: {
      itemId: string;
      action: "void" | "comp";
      cancellationReasonId?: string;
      reason?: string;
      approvalToken?: string;
    }) =>
      action === "void"
        ? voidOrderItem(orderId, itemId, reason)
        : compOrderItem(orderId, itemId, reason),
    onSuccess: (order) => {
      qc.setQueryData(orderKeys.detail(scope, orderId), order);
      qc.invalidateQueries({ queryKey: orderKeys.all(scope) });
      toast({ title: "Order item updated", tone: "success" });
    },
    onError: (error) => {
      if (toApiClientError(error).code === "MANAGER_APPROVAL_REQUIRED") return;
      toast({
        title: extractApiError(error) || "Failed to update item",
        tone: "danger",
      });
    },
  });
  return mutation;
};
