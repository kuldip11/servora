import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transferTable: vi.fn(),
  invalidateQueries: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/features/orders/services/orders.service", () => ({
  ordersService: { transferTable: mocks.transferTable },
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
    orderId: string;
    newTableId: string;
    reason?: string;
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

import { useTransferTable } from "../useTransferTable";

describe("useTransferTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates only current-context order and table families", async () => {
    mocks.transferTable.mockResolvedValue({ id: "o1" });
    useTransferTable();
    await mutationOptions.mutationFn({
      orderId: "o1",
      newTableId: "t2",
      reason: "guest move",
    });
    expect(mocks.transferTable).toHaveBeenCalledWith("o1", "t2", "guest move");

    mutationOptions.onSuccess();
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["tables", "branch-context", "fr-1", "br-1", "list"],
    });
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["orders", "list", "branch-context", "fr-1", "br-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: ["orders", "detail", "branch-context", "fr-1", "br-1"],
    });
  });
});
