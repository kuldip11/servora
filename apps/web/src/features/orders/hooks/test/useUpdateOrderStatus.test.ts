import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  useMutation: vi.fn((config: unknown) => config),
}));
const queryClient = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const notify = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
const ordersService = vi.hoisted(() => ({ updateStatus: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  ...query,
  useQueryClient: () => queryClient,
}));
vi.mock("../../../../shared/lib/query-client", () => ({ queryClient }));
vi.mock("../../../../shared/lib/notify", () => notify);
vi.mock("../../services/orders.service", () => ({ ordersService }));
vi.mock("../../query-keys", () => ({
  orderKeys: {
    detail: (id: string) => ["orders", "detail", "branch", id],
    lists: () => ["orders", "list", "branch"],
  },
}));
vi.mock("../../../tables/query-keys", () => ({
  tableKeys: { list: () => ["tables", "branch", "list"] },
}));

import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";

describe("useUpdateOrderStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates order status and invalidates related queries on success", () => {
    const mutation: any = useUpdateOrderStatus("o1");
    mutation.mutationFn("READY");
    mutation.onSuccess();

    expect(ordersService.updateStatus).toHaveBeenCalledWith("o1", "READY");
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["orders", "detail", "branch", "o1"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["orders", "list", "branch"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tables", "branch", "list"],
    });
    expect(notify.notifySuccess).toHaveBeenCalledWith("Order status updated");
  });

  it("reports update errors", () => {
    const mutation: any = useUpdateOrderStatus("o1");
    const error = new Error("boom");
    mutation.onError(error);

    expect(notify.notifyError).toHaveBeenCalledWith(
      error,
      "Failed to update status",
    );
  });
});
