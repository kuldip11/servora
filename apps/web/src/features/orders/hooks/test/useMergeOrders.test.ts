import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mergeOrders: vi.fn(),
  invalidateQueries: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/features/orders/services/orders.service", () => ({
  ordersService: { mergeOrders: mocks.mergeOrders },
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: mocks.notifySuccess,
  notifyError: mocks.notifyError,
}));
vi.mock("@/shared/lib/query-context", () => ({
  branchQueryContextKey: () => ["branch-context", "fr-1", "br-1"],
}));

let mutationOptions: {
  mutationFn: (input: {
    sourceOrderId: string;
    targetOrderId: string;
  }) => unknown;
  onSuccess: () => void;
  onError: (error: unknown) => void;
};
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useMutation: (options: typeof mutationOptions) => {
    mutationOptions = options;
    return options;
  },
}));

import { useMergeOrders } from "../useMergeOrders";

describe("useMergeOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges orders and invalidates scoped order/table caches", async () => {
    mocks.mergeOrders.mockResolvedValue({ id: "o2" });
    useMergeOrders();

    await mutationOptions.mutationFn({
      sourceOrderId: "o1",
      targetOrderId: "o2",
    });
    expect(mocks.mergeOrders).toHaveBeenCalledWith("o1", "o2");

    mutationOptions.onSuccess();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["orders", "list", "branch-context", "fr-1", "br-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["orders", "detail", "branch-context", "fr-1", "br-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tables", "branch-context", "fr-1", "br-1", "list"],
    });
    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      "Tables merged for billing",
    );
  });

  it("reports merge errors", () => {
    const error = new Error("merge failed");
    useMergeOrders();
    mutationOptions.onError(error);
    expect(mocks.notifyError).toHaveBeenCalledWith(
      error,
      "Unable to merge tables",
    );
  });
});
