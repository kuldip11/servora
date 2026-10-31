import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useQuery: vi.fn(() => ({ data: [] })),
  useMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));
vi.mock("../../hooks/useOrder", () => ({
  useOrder: vi.fn(() => ({ data: null, isLoading: true })),
}));
vi.mock("../../hooks/useUpdateOrderStatus", () => ({
  useUpdateOrderStatus: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));
vi.mock("../../hooks/useUpdateTicketStatus", () => ({
  useUpdateTicketStatus: vi.fn(() => ({
    isPending: false,
    variables: null,
    mutate: vi.fn(),
  })),
}));
vi.mock("../../hooks/useLineAdjustments", () => ({
  useLineAdjustments: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));
vi.mock("../../hooks/useTransferTable", () => ({
  useTransferTable: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));
vi.mock("../../../menu/hooks/useTables", () => ({
  useTables: vi.fn(() => ({ data: [] })),
}));
import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";
describe("OrderDetailPage", () => {
  it("renders loading state", () => {
    const html = renderToStaticMarkup(
      <OrderDetailPage orderId="o1" onBack={vi.fn()} onAddItems={vi.fn()} />,
    );
    expect(html).toContain("Order Detail");
  });
});
