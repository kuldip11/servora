import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, qc, toast, updateOrderStatus } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  qc: { invalidateQueries: vi.fn() },
  toast: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/features/orders/api/orders", () => ({ updateOrderStatus }));
import { useUpdateOrderStatus } from "../useUpdateOrderStatus";

beforeEach(() => {
  mutationConfigs.length = 0;
  vi.clearAllMocks();
});

describe("useUpdateOrderStatus", () => {
  it("updates status and handles success/error callbacks", async () => {
    useUpdateOrderStatus();
    const config = mutationConfigs.at(-1)!;
    await config.mutationFn({ id: "o1", status: "READY", reason: "r" });
    config.onSuccess();
    config.onError();
    expect(updateOrderStatus).toHaveBeenCalled();
  });
});
