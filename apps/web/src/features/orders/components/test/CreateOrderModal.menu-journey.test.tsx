import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const createOrder = vi.hoisted(() => vi.fn());
const listActiveMenus = vi.hoisted(() => vi.fn());

vi.mock("@pos/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pos/api-client")>();
  return {
    ...actual,
    createMenuApi: () => ({ listActiveMenus }),
  };
});
vi.mock("@/features/branches/hooks/useBranches", () => ({
  useBranches: () => ({
    data: [
      {
        id: "branch-1",
        dineInEnabled: true,
        takeawayEnabled: false,
        deliveryEnabled: false,
        onlineEnabled: false,
        tablesEnabled: false,
      },
    ],
  }),
}));
vi.mock("@/features/tables/hooks/useTables", () => ({
  useTables: () => ({ data: [] }),
}));
vi.mock("@/features/menu/hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({
    data: [
      {
        id: "category-1",
        tenantId: "tenant-1",
        branchId: "branch-1",
        name: "North Indian",
        description: null,
        sortOrder: 0,
        isActive: true,
        menuItems: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            tenantId: "tenant-1",
            branchId: "branch-1",
            categoryId: "category-1",
            name: "Chicken Tikka",
            description: null,
            basePrice: 220,
            taxRate: 5,
            isAvailable: true,
            imageUrl: null,
            foodType: "NON_VEG",
            spiceLevel: null,
            sku: null,
            prepTimeMinutes: null,
            sortOrder: 0,
            hsnCode: null,
            status: "ACTIVE",
            availabilityReason: null,
            statusChangedAt: "2026-09-01T00:00:00.000Z",
            enableRecipeDeduction: true,
            effectiveFrom: null,
            isPublished: true,
            publishedAt: "2026-09-01T00:00:00.000Z",
            variants: [],
            modifierGroupLinks: [],
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            tenantId: "tenant-1",
            branchId: "branch-1",
            categoryId: "category-1",
            name: "Draft Curry",
            description: null,
            basePrice: 180,
            taxRate: 5,
            isAvailable: true,
            imageUrl: null,
            foodType: "VEG",
            spiceLevel: null,
            sku: null,
            prepTimeMinutes: null,
            sortOrder: 1,
            hsnCode: null,
            status: "ACTIVE",
            availabilityReason: null,
            statusChangedAt: "2026-09-01T00:00:00.000Z",
            enableRecipeDeduction: true,
            effectiveFrom: null,
            isPublished: false,
            publishedAt: null,
            variants: [],
            modifierGroupLinks: [],
          },
        ],
      },
    ],
  }),
}));
vi.mock("@/features/orders/hooks/useCreateOrder", () => ({
  useCreateOrder: () => ({ mutate: createOrder, isPending: false }),
}));
vi.mock("@/features/orders/hooks/useCourseSequencingEnabled", () => ({
  useCourseSequencingEnabled: () => false,
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));

import { CreateOrderModal } from "@/features/orders/components/CreateOrderModal";

const renderModal = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CreateOrderModal onClose={vi.fn()} />
    </QueryClientProvider>,
  );
};

describe("menu to order real-user journey", () => {
  it("shows a published Default Menu item, hides a draft, adds it to cart, and submits a table-less dine-in order when tables are disabled", async () => {
    listActiveMenus.mockResolvedValue([
      {
        id: "default-menu",
        name: "Default Menu",
        memberships: [
          { menuItemId: "11111111-1111-4111-8111-111111111111" },
          { menuItemId: "22222222-2222-4222-8222-222222222222" },
        ],
      },
    ]);

    renderModal();

    expect(
      await screen.findByRole("button", { name: /Chicken Tikka/ }),
    ).toBeTruthy();
    expect(screen.queryByText("Draft Curry")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Chicken Tikka/ }));
    expect(screen.getByText("Order Items (1)")).toBeTruthy();

    const placeOrder = screen.getByRole("button", { name: "Place Order" });
    expect((placeOrder as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(placeOrder);

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        type: "DINE_IN",
        items: [
          expect.objectContaining({
            menuItemId: "11111111-1111-4111-8111-111111111111",
            quantity: 1,
          }),
        ],
      }),
    );
    expect(createOrder.mock.calls[0]?.[0]).not.toHaveProperty("tableId");
  });
});
