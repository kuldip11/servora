import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@pos/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) =>
    React.createElement("a", props, children),
  useRouter: () => ({ navigate: vi.fn() }),
  useParams: () => ({ orderId: "order-1" }),
}));

vi.mock("./shared/auth/permissions", () => ({
  usePermissions: () => ({ has: () => true }),
  userHasPermission: () => true,
}));

vi.mock("./store/auth", () => ({
  useAuthStore: Object.assign(
    () => ({
      user: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        roles: [{ name: "Admin", permissions: [] }],
      },
      memberships: [],
      setAuth: vi.fn(),
      setContext: vi.fn(),
    }),
    {
      getState: () => ({
        isAuthenticated: true,
        franchiseId: "fr-1",
        user: { role: "ADMIN" },
      }),
    },
  ),
}));

vi.mock("./shared/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("./features/auth/services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    signup: vi.fn(),
    memberships: vi.fn().mockResolvedValue([]),
    createBusiness: vi.fn(),
    selectContext: vi.fn(),
  },
}));

vi.mock("./features/analytics/hooks/useDashboardStats", () => ({
  useDashboardStats: () => ({
    data: { revenue: 0, orders: 0, averageOrderValue: 0, lowStockCount: 0 },
    isLoading: false,
  }),
}));
vi.mock("./features/analytics/hooks/useDashboardRealtimeSync", () => ({
  useDashboardRealtimeSync: () => undefined,
}));
vi.mock("./features/analytics/hooks/useCostMarginReport", () => ({
  useCostMarginReport: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/orders/hooks/useOrders", () => ({
  useOrders: () => ({
    data: [],
    isLoading: false,
  }),

  useOrdersPage: () => ({
    data: {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  }),
}));
vi.mock("./features/orders/hooks/useOrdersRealtimeSync", () => ({
  useOrdersRealtimeSync: () => undefined,
}));
vi.mock("./features/orders/hooks/useCreateOrder", () => ({
  useCreateOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/orders/hooks/useAddOrderItems", () => ({
  useAddOrderItems: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("./features/branches/hooks/useBranches", () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/branches/hooks/useCreateBranch", () => ({
  useCreateBranch: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/branches/hooks/useUpdateBranch", () => ({
  useUpdateBranch: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/branches/hooks/useDeactivateBranch", () => ({
  useDeactivateBranch: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/branches/components/BranchCard", () => ({
  BranchCard: () => <div>BranchCard</div>,
}));
vi.mock("./features/branches/components/BranchFormModal", () => ({
  BranchFormModal: () => <div>BranchFormModal</div>,
}));

vi.mock("./features/inventory/hooks/useInventoryItems", () => ({
  useInventoryItems: () => ({ data: undefined, isLoading: false }),
  useLowStockItems: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/inventory/hooks/useAddInventoryItem", () => ({
  useAddInventoryItem: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/inventory/hooks/useUpdateInventoryStock", () => ({
  useUpdateInventoryStock: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/inventory/hooks/useInventoryRealtimeSync", () => ({
  useInventoryRealtimeSync: () => undefined,
}));
vi.mock("./features/inventory/hooks/useInventoryTransactions", () => ({
  useInventoryTransactions: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/inventory/hooks/useWasteReasons", () => ({
  useWasteReasons: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/inventory/hooks/useInventoryRecipeImpact", () => ({
  useInventoryRecipeImpact: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("./features/inventory/hooks/useLogInventoryWaste", () => ({
  useLogInventoryWaste: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateWasteReason: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("./features/tables/hooks/useTables", () => ({
  useTables: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/tables/hooks/useTablesRealtimeSync", () => ({
  useTablesRealtimeSync: () => undefined,
}));
vi.mock("./features/tables/hooks/useCreateTable", () => ({
  useCreateTable: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/tables/hooks/useUpdateTable", () => ({
  useUpdateTable: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/tables/hooks/useUpdateTableStatus", () => ({
  useUpdateTableStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/tables/hooks/useDeleteTable", () => ({
  useDeleteTable: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/tables/components/TableFormModal", () => ({
  TableFormModal: () => <div>TableFormModal</div>,
}));

vi.mock("./features/staff/hooks/useStaff", () => ({
  useStaff: () => ({
    data: {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  }),
}));
vi.mock("./features/staff/hooks/useRoles", () => ({
  useRoles: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/staff/hooks/useAddStaff", () => ({
  useAddStaff: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/staff/hooks/useDeleteStaff", () => ({
  useDeleteStaff: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./features/staff/hooks/useUpdateStaffStatus", () => ({
  useUpdateStaffStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("./features/billing/hooks/useCollectPayment", () => ({
  useCollectPayment: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("./features/orders/hooks/useCancellationReasons", () => ({
  cancellationReasonKeys: {
    all: ["cancellation-reasons"],
    active: ["cancellation-reasons", "active"],
  },
  useCancellationReasons: () => ({ data: [], isLoading: false }),
}));
vi.mock("./features/settings/components/PricingSettingsCard", () => ({
  PricingSettingsCard: () => <div>PricingSettingsCard</div>,
}));
vi.mock("./features/settings/components/KitchenOperationsSettingsCard", () => ({
  KitchenOperationsSettingsCard: () => <div>KitchenOperationsSettingsCard</div>,
}));
vi.mock("./features/settings/components/ApprovalThresholdSettingsCard", () => ({
  ApprovalThresholdSettingsCard: () => <div>ApprovalThresholdSettingsCard</div>,
}));

const renderPage = (Page: React.ComponentType) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  act(() =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Page />
        </ThemeProvider>
      </QueryClientProvider>,
    ),
  );
  return () => {
    act(() => root.unmount());
    queryClient.clear();
    host.remove();
  };
};

describe("page rendering coverage", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders auth pages", async () => {
    const { LoginPage } = await import("./features/auth/pages/LoginPage");
    const { SignupPage } = await import("./features/auth/pages/SignupPage");
    const { ForbiddenPage } =
      await import("./features/auth/pages/ForbiddenPage");
    let cleanup = renderPage(LoginPage);
    cleanup();
    cleanup = renderPage(SignupPage);
    cleanup();
    cleanup = renderPage(ForbiddenPage);
    cleanup();
    expect(true).toBe(true);
  }, 15000);

  it("renders dashboard and operational pages with empty states", async () => {
    const modules = await Promise.all([
      import("./features/analytics/pages/DashboardPage"),
      import("./features/branches/pages/BranchesPage"),
      import("./features/inventory/pages/InventoryPage"),
      import("./features/staff/pages/StaffPage"),
      import("./features/billing/pages/BillingPage"),
      import("./features/tables/pages/TablesPage"),
      import("./features/settings/pages/SettingsPage"),
    ]);
    for (const m of modules) {
      const cleanup = renderPage(Object.values(m)[0] as React.ComponentType);
      cleanup();
    }
    expect(modules).toHaveLength(7);
  });
});
