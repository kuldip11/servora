import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { extractApiError } from "@pos/api-client";
import {
  addOrderItems,
  type AddOrderComboInput,
  type AddOrderItemInput,
} from "@/features/orders/api/orders";
import { orderKeys } from "@/features/orders/constants";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

interface Params {
  orderId: string;
  items: AddOrderItemInput[];
  combos: AddOrderComboInput[];
  notes?: string;
  couponCode?: string;
  promotionIds?: string[];
}

export const useAddOrderItems = () => {
  const qc = useQueryClient();
  const scope = getWaiterQueryScope();

  return useMutation({
    mutationFn: ({
      orderId,
      items,
      combos,
      notes,
      couponCode,
      promotionIds,
    }: Params) =>
      addOrderItems(orderId, items, combos, notes, {
        ...(couponCode ? { couponCode } : {}),
        ...(promotionIds?.length ? { promotionIds } : {}),
      }),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: orderKeys.all(scope) });
      qc.invalidateQueries({
        queryKey: orderKeys.detail(scope, variables.orderId),
      });
      toast({ title: "Sent to kitchen!", tone: "success" });
    },
    onError: (err: unknown) => {
      toast({
        title: extractApiError(err, "Failed"),
        tone: "danger",
      });
    },
  });
};
