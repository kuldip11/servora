import type { CustomerMenuItem } from "@/features/menu/api";
import type { CartLine, SelectedOption } from "./pricing";

type PersistedSession = {
  token: string;
  mode: "DINE_IN" | "TAKEAWAY";
  table: string | null;
  area: string;
  restaurant: string;
  estimatedTime: string;
  expiresAt: string;
};

type PersistedCartLine = {
  itemId: string;
  quantity: number;
  variantId?: string;
  selectedOptions: SelectedOption[];
  fulfillmentType: "DINE_IN" | "TAKEAWAY";
};

import { CART_STORAGE_PREFIX } from "./constants";

const key = (scope: string, name: string) => {
  return `${CART_STORAGE_PREFIX}:${scope}:${name}`;
};

function read<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const write = (storageKey: string, value: unknown) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (privacy mode/quota); cart persistence is best effort.
  }
};

const remove = (storageKey: string) => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Storage removal is best effort and must not block ordering.
  }
};

export const getCustomerStorageScope = (qrToken: string | null) => {
  return qrToken ? `qr:${qrToken}` : null;
};

export const loadPersistedSession = (
  scope: string,
): PersistedSession | null => {
  return read<PersistedSession>(key(scope, "session"));
};

export const savePersistedSession = (
  scope: string,
  session: PersistedSession,
) => {
  write(key(scope, "session"), session);
};

export const clearPersistedSession = (scope: string) => {
  remove(key(scope, "session"));
};

export const loadPersistedOrderId = (scope: string): string | null => {
  const value = read<{ orderId: string }>(key(scope, "order"));
  return value?.orderId ?? null;
};

export const savePersistedOrderId = (scope: string, orderId: string) => {
  write(key(scope, "order"), { orderId });
};

export const clearPersistedOrderId = (scope: string) => {
  remove(key(scope, "order"));
};

export const loadPersistedCart = (scope: string): PersistedCartLine[] => {
  const value = read<PersistedCartLine[]>(key(scope, "cart"));
  if (!Array.isArray(value)) return [];
  return value.filter(
    (line) =>
      line &&
      typeof line.itemId === "string" &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0,
  );
};

export const savePersistedCart = (scope: string, cart: CartLine[]) => {
  const snapshot: PersistedCartLine[] = cart.map((line) => ({
    itemId: line.item.id,
    quantity: line.quantity,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    selectedOptions: line.selectedOptions,
    fulfillmentType: line.fulfillmentType,
  }));
  write(key(scope, "cart"), snapshot);
};

export const clearPersistedCart = (scope: string) => {
  remove(key(scope, "cart"));
};

const validOptions = (
  item: CustomerMenuItem,
  selectedOptions: SelectedOption[],
) => {
  return selectedOptions.filter((selection) => {
    const option = item.modifierGroupLinks
      .flatMap(({ group }) => group.options)
      .find((value) => value.id === selection.optionId);
    return (
      Boolean(option?.isAvailable) &&
      Number.isInteger(selection.quantity) &&
      selection.quantity > 0 &&
      selection.quantity <= option!.maxQuantity
    );
  });
};

export const restoreCart = (
  scope: string,
  menu: CustomerMenuItem[],
  mode: "DINE_IN" | "TAKEAWAY",
) => {
  const persisted = loadPersistedCart(scope);
  if (!persisted.length) return { cart: [] as CartLine[], droppedCount: 0 };

  const itemMap = new Map(menu.map((item) => [item.id, item]));
  let droppedCount = 0;
  const cart = persisted.flatMap((line) => {
    const item = itemMap.get(line.itemId);
    if (!item) {
      droppedCount += 1;
      return [];
    }
    if (
      line.variantId &&
      !item.variants.some((variant) => variant.id === line.variantId)
    ) {
      droppedCount += 1;
      return [];
    }
    const selectedOptions = validOptions(item, line.selectedOptions ?? []);
    const fulfillmentType =
      mode === "TAKEAWAY" ? "TAKEAWAY" : line.fulfillmentType;
    return [
      {
        item,
        quantity: line.quantity,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        selectedOptions,
        fulfillmentType,
      },
    ];
  });

  return { cart, droppedCount };
};
