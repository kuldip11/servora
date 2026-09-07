import { useQuery } from "@tanstack/react-query";
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
  clearPersistedSession,
  loadPersistedOrderId,
  loadPersistedSession,
  restoreCart,
  savePersistedSession,
} from "@/features/cart/persistence";

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

const bootstrapCustomerSession = async (
  qrToken: string,
  storageScope: string | null,
): Promise<CustomerBootstrapData> => {
  const persisted = storageScope ? loadPersistedSession(storageScope) : null;
  let sessionToken = persisted?.token;
  let created: Awaited<ReturnType<typeof createCustomerSession>> | null = null;
  let menuResponse: Awaited<ReturnType<typeof getCustomerMenu>> | undefined;

  if (sessionToken) {
    try {
      menuResponse = await getCustomerMenu(sessionToken);
    } catch {
      if (storageScope) clearPersistedSession(storageScope);
      sessionToken = undefined;
    }
  }

  if (!menuResponse) {
    created = await createCustomerSession(qrToken);
    sessionToken = created.sessionToken;
    menuResponse = await getCustomerMenu(sessionToken);
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
        restoredOrder = await getCustomerOrder(sessionToken, persistedOrderId);
      } catch {
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

export const bootstrapQueryKey = (
  qrToken: string | null,
  storageScope: string | null,
) =>
  ["customer-bootstrap", qrToken ?? "missing", storageScope ?? "none"] as const;

export const orderQueryKey = (sessionToken?: string, orderId?: string) =>
  ["customer-order", sessionToken ?? "none", orderId ?? "none"] as const;

export const useCustomerBootstrap = (
  qrToken: string | null,
  storageScope: string | null,
) =>
  useQuery({
    queryKey: bootstrapQueryKey(qrToken, storageScope),
    queryFn: () => bootstrapCustomerSession(qrToken!, storageScope),
    enabled: Boolean(qrToken),
    retry: false,
  });
