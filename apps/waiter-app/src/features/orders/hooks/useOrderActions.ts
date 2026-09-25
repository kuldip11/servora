import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@pos/api-client";
import { toast } from "@pos/ui";
import {
  fetchCancellationReasons,
  fetchOrders,
  mergeOrders,
  refireOrderItem,
  refillOrderItem,
  setOrderItemSeatShares,
  splitOrderBill,
  splitOrderBillByItems,
  splitOrderBillBySeat,
} from "@/features/orders/api/orders";
import { orderKeys } from "@/features/orders/constants";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

const useOrderMutationContext = (orderId: string) => {
  const queryClient = useQueryClient();
  const scope = getWaiterQueryScope();
  const refreshOrder = () => {
    void queryClient.invalidateQueries({
      queryKey: orderKeys.detail(scope, orderId),
    });
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists(scope) });
  };
  return { queryClient, scope, refreshOrder };
};

export const useCancellationReasons = () => {
  const scope = getWaiterQueryScope();
  return useQuery({
    queryKey: orderKeys.cancellationReasons(scope),
    queryFn: ({ signal }) => fetchCancellationReasons(signal),
  });
};

export const useRefillOrderItem = (orderId: string) => {
  const { queryClient, scope } = useOrderMutationContext(orderId);
  return useMutation({
    mutationFn: (itemId: string) => refillOrderItem(orderId, itemId),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(scope, orderId), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(scope) });
    },
    onError: (error) =>
      toast({
        title: extractApiError(error, "Failed to refill item"),
        tone: "danger",
      }),
  });
};

export const useRefireOrderItem = (orderId: string, onSuccess: () => void) => {
  const { queryClient, scope } = useOrderMutationContext(orderId);
  return useMutation({
    mutationFn: ({
      selectedItemId,
      selectedReason,
      compOriginal,
    }: {
      selectedItemId: string;
      selectedReason: string;
      compOriginal: boolean;
    }) =>
      refireOrderItem(orderId, selectedItemId, selectedReason, compOriginal),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(scope, orderId), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(scope) });
      onSuccess();
    },
  });
};

export const useSetOrderItemSeatShares = (
  orderId: string,
  onSuccess: () => void,
) => {
  const { refreshOrder } = useOrderMutationContext(orderId);
  return useMutation({
    mutationFn: ({
      selectedItemId,
      nextShares,
    }: {
      selectedItemId: string;
      nextShares: Array<{ seatLabel: string; shareRatio: number }>;
    }) => setOrderItemSeatShares(orderId, selectedItemId, nextShares),
    onSuccess: () => {
      refreshOrder();
      onSuccess();
    },
  });
};

export const useSplitOrderBill = (orderId: string, onSuccess: () => void) => {
  const { refreshOrder } = useOrderMutationContext(orderId);
  const splitBill = useMutation({
    mutationFn: ({
      billCount,
      allocations,
    }: {
      billCount: number;
      allocations?: Array<{ label: string; orderItemIds: string[] }>;
    }) =>
      allocations
        ? splitOrderBillByItems(orderId, allocations)
        : splitOrderBill(orderId, billCount),
    onSuccess: () => {
      refreshOrder();
      onSuccess();
    },
  });
  const splitBySeat = useMutation({
    mutationFn: (strategy: "EVEN_SPLIT" | "MANUAL") =>
      splitOrderBillBySeat(orderId, strategy),
    onSuccess: refreshOrder,
  });
  return { splitBill, splitBySeat, refreshOrder };
};

export const useMergeCandidates = (open: boolean) => {
  const scope = getWaiterQueryScope();
  return useQuery({
    queryKey: orderKeys.list(scope, { view: "ACTIVE", limit: 100 }),
    queryFn: async ({ signal }) =>
      (await fetchOrders({ view: "ACTIVE", limit: 100 }, signal)).items,
    enabled: open,
  });
};

export const useMergeOrder = (orderId: string, onSuccess: () => void) => {
  const { refreshOrder } = useOrderMutationContext(orderId);
  return useMutation({
    mutationFn: (targetOrderId: string) => mergeOrders(orderId, targetOrderId),
    onSuccess: () => {
      refreshOrder();
      onSuccess();
    },
  });
};
