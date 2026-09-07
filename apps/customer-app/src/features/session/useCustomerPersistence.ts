import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { CustomerOrder } from "@/api";
import type { CartLine } from "@/features/cart/pricing";
import {
  savePersistedCart,
  savePersistedOrderId,
} from "@/features/cart/persistence";
import type { CustomerBootstrapData } from "@/features/session/useCustomerBootstrap";
import { orderQueryKey } from "@/features/session/useCustomerBootstrap";

type UseCustomerPersistenceArgs = {
  bootstrapData: CustomerBootstrapData | undefined;
  storageScope: string | null;
  queryClient: QueryClient;
};

export const useCustomerPersistence = ({
  bootstrapData,
  storageScope,
  queryClient,
}: UseCustomerPersistenceArgs) => {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hydratedSessionToken, setHydratedSessionToken] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!bootstrapData || hydratedSessionToken === bootstrapData.session.token)
      return;
    setCart(bootstrapData.restoredCart);
    setPlacedOrderId(bootstrapData.restoredOrder?.id ?? null);
    if (bootstrapData.restoredOrder) {
      queryClient.setQueryData<CustomerOrder>(
        orderQueryKey(
          bootstrapData.session.token,
          bootstrapData.restoredOrder.id,
        ),
        bootstrapData.restoredOrder,
      );
    }
    setLocalError(bootstrapData.cartWarning);
    setHydratedSessionToken(bootstrapData.session.token);
  }, [bootstrapData, hydratedSessionToken, queryClient]);

  useEffect(() => {
    if (!storageScope || !hydratedSessionToken) return;
    savePersistedCart(storageScope, cart);
  }, [cart, hydratedSessionToken, storageScope]);

  useEffect(() => {
    if (!storageScope || !placedOrderId) return;
    savePersistedOrderId(storageScope, placedOrderId);
  }, [placedOrderId, storageScope]);

  return {
    cart,
    setCart,
    placedOrderId,
    setPlacedOrderId,
    localError,
    setLocalError,
  };
};
