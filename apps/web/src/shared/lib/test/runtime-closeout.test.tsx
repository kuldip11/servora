import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ordersListQuery,
  orderDetailQuery,
  orderExplanationQuery,
} from "@/features/orders/query-options";
import { tablesQuery, takeawayQrQuery } from "@/features/tables/query-options";
import {
  inventoryItemsQuery,
  lowStockItemsQuery,
} from "@/features/inventory/query-options";
import {
  staffListQuery,
  rolesListQuery,
  rolePermissionsQuery,
} from "@/features/staff/query-options";
import { branchesQuery } from "@/features/branches/query-options";
import {
  dashboardStatsQuery,
  costMarginQuery,
  menuEngineeringQuery,
} from "@/features/analytics/query-options";
import { availabilityDashboardQuery } from "@/features/availability/query-options";
import { operationsSnapshotQuery } from "@/features/operations/query-options";
import { orderBillsQuery } from "@/features/billing/query-options";
import {
  tenantSettingsQuery,
  approvalThresholdsQuery,
} from "@/features/settings/query-options";
import { useInventoryTransactions } from "@/features/inventory/hooks/useInventoryTransactions";
import { useWasteReasons } from "@/features/inventory/hooks/useWasteReasons";
import { useInventoryRecipeImpact } from "@/features/inventory/hooks/useInventoryRecipeImpact";
import { useInventoryRealtimeSync } from "@/features/inventory/hooks/useInventoryRealtimeSync";
import { useCreateMenu } from "@/features/menu/hooks/useMenus";
import { useAuthStore } from "@/store/auth";
import { queryClient as singleton } from "@/shared/lib/query-client";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  handlers: new Map<string, (event: any) => void>(),
  create: vi.fn(),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: { get: h.get } }));
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (type: string, handler: any) =>
    h.handlers.set(type, handler),
}));
vi.mock("@/features/menu/services/menus.service", () => ({
  menusService: { create: h.create },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore
    .getState()
    .setContext({ membershipId: "m1", franchiseId: "f1", branchId: "b1" });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  h.get.mockImplementation(async (url: string) => ({
    data: {
      data:
        url === "/tenants"
          ? [{ tenant: { id: "f1" } }]
          : url.includes("availability")
            ? { rows: [] }
            : [],
      pagination: { page: 1, total: 0 },
    },
  }));
});
afterEach(() => {
  cleanup();
  client.clear();
  singleton.clear();
});

const cases: Array<[string, () => any, number]> = [
  ["orders", () => ordersListQuery({ page: 2 }), 1],
  ["order detail", () => orderDetailQuery("o1"), 1],
  ["order explanation", () => orderExplanationQuery("o1"), 1],
  ["tables", tablesQuery, 1],
  ["takeaway QR", () => takeawayQrQuery("b1"), 1],
  ["inventory", () => inventoryItemsQuery({ page: 2 }), 1],
  ["low stock", lowStockItemsQuery, 1],
  ["staff", () => staffListQuery({ page: 2 }), 1],
  ["roles", rolesListQuery, 1],
  ["permissions", () => rolePermissionsQuery("r1"), 2],
  ["branches", branchesQuery, 1],
  ["dashboard", dashboardStatsQuery, 1],
  ["cost margin", () => costMarginQuery("c1"), 1],
  ["menu engineering", () => menuEngineeringQuery(30), 1],
  [
    "availability",
    () =>
      availabilityDashboardQuery({
        channel: "UNSCOPED",
        fulfillmentType: "UNSCOPED",
      }),
    1,
  ],
  ["operations fanout", operationsSnapshotQuery, 3],
  ["billing", () => orderBillsQuery("o1"), 1],
  ["settings", () => tenantSettingsQuery("f1"), 1],
  ["approval thresholds", approvalThresholdsQuery, 1],
];
describe("operational query cancellation contract", () => {
  it.each(cases)(
    "passes one TanStack signal to every %s GET",
    async (_name, options, count) => {
      await client.fetchQuery(options());
      expect(h.get).toHaveBeenCalledTimes(count);
      const signals = h.get.mock.calls.map((call) => call[1]?.signal);
      expect(signals[0]).toBeInstanceOf(AbortSignal);
      expect(signals.every((signal) => signal === signals[0])).toBe(true);
    },
  );
  it.each([
    ["transactions", useInventoryTransactions],
    ["waste reasons", useWasteReasons],
    ["recipe impact", () => useInventoryRecipeImpact("i1")],
  ] as const)("passes signals from the %s hook", async (_name, hook) => {
    renderHook(
      () => {
        hook();
      },
      { wrapper },
    );
    await waitFor(() => expect(h.get).toHaveBeenCalledOnce());
    expect(h.get.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });
  it("aborts an in-flight operational GET and cannot cache its late result", async () => {
    let finish!: (value: any) => void;
    h.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const options = ordersListQuery({});
    const pending = client.fetchQuery(options).catch(() => undefined);
    const signal = h.get.mock.calls[0]![1].signal as AbortSignal;
    await client.cancelQueries();
    expect(signal.aborted).toBe(true);
    finish({ data: { data: [{ id: "old" }], pagination: {} } });
    await pending;
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  });
});

it("uses the provider client in mutation helpers rather than the singleton", async () => {
  const local = vi.spyOn(client, "invalidateQueries");
  const global = vi.spyOn(singleton, "invalidateQueries");
  h.create.mockResolvedValue({ id: "menu1" });
  const { result } = renderHook(useCreateMenu, { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ name: "Lunch" } as any);
  });
  expect(local).toHaveBeenCalledOnce();
  expect(global).not.toHaveBeenCalled();
});
it("invalidates paginated inventory and low-stock caches on its provider", () => {
  const local = vi.spyOn(client, "invalidateQueries");
  const global = vi.spyOn(singleton, "invalidateQueries");
  renderHook(useInventoryRealtimeSync, { wrapper });
  h.handlers.get("inventory.low_stock")!({ payload: { id: "i1" } });
  expect(local).toHaveBeenCalledTimes(2);
  expect(global).not.toHaveBeenCalled();
});
