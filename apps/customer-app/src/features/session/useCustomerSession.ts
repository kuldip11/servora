import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerRequest,
  getCustomerOrder,
  type CustomerOrder,
  type CustomerRequestType,
} from "@/api";
import { getCustomerStorageScope } from "@/features/cart/persistence";
import { useCustomerOrderRealtime } from "@/features/ordering/useCustomerOrderRealtime";
import {
  orderQueryKey,
  useCustomerBootstrap,
} from "@/features/session/useCustomerBootstrap";
import { useCustomerPersistence } from "@/features/session/useCustomerPersistence";

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

  const setPlacedOrder = useCallback(
    (
      value:
        | CustomerOrder
        | null
        | ((current: CustomerOrder | null) => CustomerOrder | null),
    ) => {
      const current = persistence.placedOrderId
        ? (queryClient.getQueryData<CustomerOrder>(
            orderQueryKey(session?.token, persistence.placedOrderId),
          ) ?? null)
        : null;
      const next = typeof value === "function" ? value(current) : value;

      if (!next) {
        persistence.setPlacedOrderId(null);
        return;
      }

      persistence.setPlacedOrderId(next.id);
      if (session?.token) {
        queryClient.setQueryData(orderQueryKey(session.token, next.id), next);
      }
    },
    [persistence, queryClient, session?.token],
  );

  const handleRealtimeOrder = useCallback(
    (order: CustomerOrder) => {
      persistence.setPlacedOrderId(order.id);
      if (session?.token) {
        queryClient.setQueryData(orderQueryKey(session.token, order.id), order);
      }
    },
    [persistence, queryClient, session?.token],
  );
  const handleRealtimeMenuAvailability = useCallback(() => {
    void bootstrapQuery.refetch();
  }, [bootstrapQuery]);

  const live = useCustomerOrderRealtime(
    session?.token,
    persistence.placedOrderId ?? undefined,
    handleRealtimeOrder,
    handleRealtimeMenuAvailability,
  );

  const orderQuery = useQuery({
    queryKey: orderQueryKey(
      session?.token,
      persistence.placedOrderId ?? undefined,
    ),
    queryFn: () => getCustomerOrder(session!.token, persistence.placedOrderId!),
    enabled: Boolean(session && persistence.placedOrderId),
    initialData: () =>
      persistence.placedOrderId
        ? queryClient.getQueryData<CustomerOrder>(
            orderQueryKey(session?.token, persistence.placedOrderId),
          )
        : undefined,
    staleTime: 15_000,
    refetchInterval: live ? false : 15_000,
    retry: false,
  });
  const placedOrder = orderQuery.data ?? null;

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
          requestError instanceof Error
            ? requestError.message
            : "Could not send request",
        );
      }
    },
    [requestMutation, session],
  );

  const retryBootstrap = useCallback(() => {
    persistence.setLocalError(null);
    void bootstrapQuery.refetch();
  }, [bootstrapQuery, persistence]);

  const missingQrError = qrToken
    ? null
    : "Open this page from a restaurant table QR code to start an ordering session.";
  const bootstrapError = bootstrapQuery.error
    ? bootstrapQuery.error instanceof Error
      ? bootstrapQuery.error.message
      : "Unable to load this ordering session"
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
    loading: isActionLoading || (Boolean(qrToken) && bootstrapQuery.isPending),
    setLoading: setIsActionLoading,
    error: persistence.localError ?? bootstrapError ?? missingQrError,
    setError: persistence.setLocalError,
    requestBusy: requestMutation.isPending,
    requestMessage,
    storageScope,
    live,
    requestHelp,
    retryBootstrap,
  };
};
