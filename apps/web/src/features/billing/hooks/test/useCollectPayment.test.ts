import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutationOptions: null as any,
  invalidateQueries: vi.fn(),
  collectPayment: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useMutation: (options: any) => {
    mocks.mutationOptions = options;
    return options;
  },
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock("@/features/billing/services/billing.service", () => ({
  billingService: { collectPayment: mocks.collectPayment },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: mocks.success,
  notifyError: mocks.error,
}));
vi.mock("@/store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { useCollectPayment } from "@/features/billing/hooks/useCollectPayment";

describe("useCollectPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCollectPayment();
  });

  it("invalidates only current billing/order/table caches", () => {
    mocks.mutationOptions.onSuccess(undefined, {
      orderId: "o1",
      input: { method: "CASH", amount: 10 },
    });

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["billing", "branch-context", "fr-1", "br-1", "order", "o1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["orders", "detail", "branch-context", "fr-1", "br-1", "o1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["orders", "list", "branch-context", "fr-1", "br-1"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tables", "branch-context", "fr-1", "br-1", "list"],
    });
  });
});
