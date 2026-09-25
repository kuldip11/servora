import type { QueryClient } from "@tanstack/react-query";
import { toApiClientError } from "@pos/api-client";
import {
  createCustomerSession,
  getCustomerMenu,
  getCustomerOrder,
  type CustomerCombo,
  type CustomerMenuItem,
  type CustomerOrder,
} from "@/api";
import type { CartLine } from "@/features/cart/pricing";
import {
  clearPersistedOrderId,
  loadPersistedOrderId,
  loadPersistedSession,
  restoreCart,
  savePersistedSession,
} from "@/features/cart/persistence";
import { customerKeys } from "./customer.keys";
import { expireCustomerSession } from "./customer.lifecycle";

export type CustomerSessionState = {
  token: string;
  mode: "DINE_IN" | "TAKEAWAY";
  table: string | null;
  area: string;
  restaurant: string;
  estimatedTime: string;
  expiresAt: string;
};

export type CustomerBootstrapData = {
  session: CustomerSessionState;
  menu: CustomerMenuItem[];
  combos: CustomerCombo[];
  categories: Array<{ id: string; name: string }>;
  restoredCart: CartLine[];
  restoredOrder: CustomerOrder | null;
  cartWarning: string | null;
};

const bootstrapCustomerSession = async ({
  qrToken,
  storageScope,
  signal,
  queryClient,
}: {
  qrToken: string;
  storageScope: string | null;
  signal: AbortSignal;
  queryClient: QueryClient;
}): Promise<CustomerBootstrapData> => {
  const persisted = storageScope ? loadPersistedSession(storageScope) : null;
  let sessionToken = persisted?.token;
  let created: Awaited<ReturnType<typeof createCustomerSession>> | null = null;
  let menuResponse: Awaited<ReturnType<typeof getCustomerMenu>> | undefined;

  if (sessionToken) {
    try {
      menuResponse = await getCustomerMenu(sessionToken, signal);
    } catch (error) {
      const apiError = toApiClientError(error);
      const sessionIsInvalid =
        apiError.status === 401 ||
        apiError.code === "UNAUTHORIZED" ||
        apiError.code === "CUSTOMER_SESSION_REQUIRED";

      if (!sessionIsInvalid) throw error;

      if (storageScope) {
        await expireCustomerSession(queryClient, storageScope, sessionToken);
      }
      sessionToken = undefined;
    }
  }

  if (!menuResponse) {
    created = await createCustomerSession(qrToken);
    sessionToken = created.sessionToken;
    menuResponse = await getCustomerMenu(sessionToken, signal);
  }

  if (!sessionToken) throw new Error("Unable to establish customer session");

  const session: CustomerSessionState = {
    token: sessionToken,
    mode: menuResponse.mode,
    table: menuResponse.table?.name ?? null,
    area:
      menuResponse.table?.section ??
      (menuResponse.mode === "TAKEAWAY" ? "Takeaway" : "Dining"),
    restaurant: menuResponse.restaurant.name,
    estimatedTime: "15–25 min",
    expiresAt:
      created?.expiresAt ??
      persisted?.expiresAt ??
      new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
  };

  let restoredOrder: CustomerOrder | null = null;
  let restoredCart: CartLine[] = [];
  let cartWarning: string | null = null;

  if (storageScope) {
    savePersistedSession(storageScope, session);
    const persistedOrderId = loadPersistedOrderId(storageScope);
    if (persistedOrderId) {
      try {
        restoredOrder = await getCustomerOrder(
          sessionToken,
          persistedOrderId,
          signal,
        );
      } catch (error) {
        const apiError = toApiClientError(error);
        const persistedOrderIsInvalid =
          apiError.status === 400 ||
          apiError.status === 403 ||
          apiError.status === 404 ||
          apiError.code === "NOT_FOUND";

        if (!persistedOrderIsInvalid) throw error;
        clearPersistedOrderId(storageScope);
      }
    }
    const restored = restoreCart(
      storageScope,
      menuResponse.items,
      menuResponse.mode,
    );
    restoredCart = restored.cart;
    if (restored.droppedCount > 0) {
      cartWarning =
        "Some saved cart items are no longer available and were removed.";
    }
  }

  return {
    session,
    menu: menuResponse.items,
    combos: menuResponse.combos ?? [],
    categories: [
      { id: "popular", name: "Popular" },
      ...menuResponse.categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    ],
    restoredCart,
    restoredOrder,
    cartWarning,
  };
};

export const customerBootstrapQuery = (
  queryClient: QueryClient,
  qrToken: string | null,
  storageScope: string | null,
) => ({
  queryKey: customerKeys.bootstrap(qrToken, storageScope),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    bootstrapCustomerSession({
      qrToken: qrToken!,
      storageScope,
      signal,
      queryClient,
    }),
  enabled: Boolean(qrToken),
  retry: false,
});

export const customerOrderQuery = (
  storageScope: string | null,
  sessionToken: string | undefined,
  orderId: string | undefined,
  live: boolean,
) => ({
  queryKey: customerKeys.order(storageScope, sessionToken, orderId),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    getCustomerOrder(sessionToken!, orderId!, signal),
  enabled: Boolean(sessionToken && orderId),
  staleTime: 15_000,
  refetchInterval: live ? (false as const) : 15_000,
  retry: false,
});
