export const customerKeys = {
  all: ["customer"] as const,
  bootstrap: (qrToken: string | null, storageScope: string | null) =>
    [
      ...customerKeys.all,
      "bootstrap",
      qrToken ?? "missing",
      storageScope ?? "none",
    ] as const,
  session: (storageScope: string | null, sessionToken?: string) =>
    [
      ...customerKeys.all,
      "session",
      storageScope ?? "none",
      sessionToken ?? "none",
    ] as const,
  orders: (storageScope: string | null, sessionToken?: string) =>
    [...customerKeys.session(storageScope, sessionToken), "orders"] as const,
  order: (
    storageScope: string | null,
    sessionToken?: string,
    orderId?: string,
  ) =>
    [
      ...customerKeys.orders(storageScope, sessionToken),
      orderId ?? "none",
    ] as const,
};
