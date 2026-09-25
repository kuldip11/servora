import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { transferOrderTable } from "@/features/orders/api/orders";
import { extractApiError } from "@pos/api-client";
import { orderKeys } from "@/features/orders/constants";
import { menuKeys } from "@/features/menu/query/menu.keys";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export const useTransferTable = (orderId: string) => {
  const queryClient = useQueryClient();
  const scope = getWaiterQueryScope();
  return useMutation({
    mutationFn: ({
      newTableId,
      reason,
    }: {
      newTableId: string;
      reason?: string;
    }) => transferOrderTable(orderId, newTableId, reason),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(scope, orderId), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all(scope) });
      queryClient.invalidateQueries({ queryKey: menuKeys.tables(scope) });
      toast({ title: "Table transferred", tone: "success" });
    },
    onError: (error) =>
      toast({
        title: extractApiError(error, "Failed to transfer table"),
        tone: "danger",
      }),
  });
};
