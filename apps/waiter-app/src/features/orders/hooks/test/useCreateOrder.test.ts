import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, qc, toast, createOrder } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  qc: { invalidateQueries: vi.fn() },
  toast: vi.fn(),
  createOrder: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/features/orders/api/createOrder", () => ({ createOrder }));
import { useCreateOrder } from "../useCreateOrder";

beforeEach(() => {
  mutationConfigs.length = 0;
  vi.clearAllMocks();
});

describe("useCreateOrder", () => {
  it("runs mutation, invalidates queries, and handles errors", async () => {
    useCreateOrder();
    const config = mutationConfigs.at(-1)!;
    await config.mutationFn({ branchId: "b" });
    expect(createOrder).toHaveBeenCalled();
    config.onSuccess();
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
    config.onError({ response: { data: { message: "specific" } } });
    config.onError({ response: { data: { message: 1 } } });
    config.onError(null);
    expect(toast).toHaveBeenCalledWith({ title: "specific", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({ title: "Failed", tone: "danger" });
  });
});
