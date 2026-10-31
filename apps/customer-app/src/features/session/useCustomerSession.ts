import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerRequest,
  type CustomerOrder,
  type CustomerRequestType,
} from "@/api";
import { getCustomerStorageScope } from "@/features/cart";
import { useCustomerOrderRealtime } from "@/features/ordering";
import { useCustomerBootstrap } from "@/features/session/useCustomerBootstrap";
import { useCustomerPersistence } from "@/features/session/useCustomerPersistence";
import { extractApiError } from "@pos/api-client";
import { customerKeys } from "@/features/session/query/customer.keys";
import { customerOrderQuery } from "@/features/session/query/customer.queries";

export type { CustomerSessionState } from "@/features/session/useCustomerBootstrap";

export const useCustomerSession = () => {
  const queryClient = useQueryClient();
  const qrToken = useMemo(
    () => new URLSearchParams(window.location.search).get("qr"),
    [],
  );
  const storageScope = useMemo(
    () => getCustomerStorageScope(qrToken),
    [qrToken],
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const bootstrapQuery = useCustomerBootstrap(qrToken, storageScope);
  const bootstrapData = bootstrapQuery.data;
  const session = bootstrapData?.session ?? null;
  const persistence = useCustomerPersistence({
    bootstrapData,
    storageScope,
    queryClient,
  });

  const { placedOrderId, setPlacedOrderId, setLocalError } = persistence;
  const { refetch: refetchBootstrap } = bootstrapQuery;

  const setPlacedOrder = useCallback(
    (
      value:
        | CustomerOrder
        | null
        | ((current: CustomerOrder | null) => CustomerOrder | null),
    ) => {
      const current = placedOrderId
        ? (queryClient.getQueryData<CustomerOrder>(
            customerKeys.order(storageScope, session?.token, placedOrderId),
          ) ?? null)
        : null;
      const next = typeof value === "function" ? value(current) : value;

      if (!next) {
        setPlacedOrderId(null);
        return;
      }

      setPlacedOrderId(next.id);
      if (session?.token) {
        queryClient.setQueryData(
          customerKeys.order(storageScope, session.token, next.id),
          next,
        );
      }
    },
    [
      placedOrderId,
      setPlacedOrderId,
      queryClient,
      session?.token,
      storageScope,
    ],
  );

  const handleRealtimeOrder = useCallback(
    (order: CustomerOrder) => {
      setPlacedOrderId(order.id);
      if (session?.token) {
        queryClient.setQueryData(
          customerKeys.order(storageScope, session.token, order.id),
          order,
        );
      }
    },
    [setPlacedOrderId, queryClient, session?.token, storageScope],
  );
  const handleRealtimeMenuAvailability = useCallback(() => {
    void refetchBootstrap();
  }, [refetchBootstrap]);

  const live = useCustomerOrderRealtime(
    session?.token,
    placedOrderId ?? undefined,
    handleRealtimeOrder,
    handleRealtimeMenuAvailability,
  );

  const orderQuery = useQuery({
    ...customerOrderQuery(
      storageScope,
      session?.token,
      placedOrderId ?? undefined,
    ),
    initialData: () =>
      placedOrderId
        ? queryClient.getQueryData<CustomerOrder>(
            customerKeys.order(storageScope, session?.token, placedOrderId),
          )
        : undefined,
  });
  const placedOrder = orderQuery.data ?? null;
  const activeOrderError =
    placedOrderId && orderQuery.error
      ? extractApiError(orderQuery.error, "Unable to refresh your order status")
      : null;

  const requestMutation = useMutation({
    mutationFn: (type: CustomerRequestType) => {
      if (!session) throw new Error("Ordering session is unavailable");
      return createCustomerRequest(session.token, type, placedOrder?.id);
    },
  });

  const requestHelp = useCallback(
    async (type: CustomerRequestType) => {
      if (!session) return;
      setRequestMessage(null);
      try {
        await requestMutation.mutateAsync(type);
        setRequestMessage(
          type === "BILL"
            ? "Your waiter has been asked to bring the bill."
            : "Request sent. Someone will be with you shortly.",
        );
      } catch (requestError) {
        setRequestMessage(
          extractApiError(requestError, "Could not send request"),
        );
      }
    },
    [requestMutation, session],
  );

  const retryBootstrap = useCallback(() => {
    setLocalError(null);
    void refetchBootstrap();
  }, [refetchBootstrap, setLocalError]);

  const retryActiveOrder = useCallback(() => {
    void orderQuery.refetch();
  }, [orderQuery]);

  const missingQrError = qrToken
    ? null
    : "Open this page from a restaurant table QR code to start an ordering session.";
  const bootstrapError = bootstrapQuery.error
    ? extractApiError(
        bootstrapQuery.error,
        "Unable to load this ordering session",
      )
    : null;

  return {
    session,
    menu: bootstrapData?.menu ?? [],
    combos: bootstrapData?.combos ?? [],
    categories: bootstrapData?.categories ?? [],
    cart: persistence.cart,
    setCart: persistence.setCart,
    placedOrder,
    setPlacedOrder,
    activeOrderError,
    activeOrderRefreshing: orderQuery.isFetching,
    retryActiveOrder,
    loading: isActionLoading || (Boolean(qrToken) && bootstrapQuery.isPending),
    setLoading: setIsActionLoading,
    error: persistence.localError ?? bootstrapError ?? missingQrError,
    setError: setLocalError,
    requestBusy: requestMutation.isPending,
    requestMessage,
    storageScope,
    live,
    requestHelp,
    retryBootstrap,
  };
};
