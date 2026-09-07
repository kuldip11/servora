import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, qc, toast, addOrderItems } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  qc: { invalidateQueries: vi.fn() },
  toast: vi.fn(),
  addOrderItems: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/features/orders/api/orders", () => ({ addOrderItems }));
import { useAddOrderItems } from "../useAddOrderItems";

beforeEach(() => {
  mutationConfigs.length = 0;
  vi.clearAllMocks();
});

describe("useAddOrderItems", () => {
  it("handles payload variants, success invalidation, and errors", async () => {
    useAddOrderItems();
    const config = mutationConfigs.at(-1)!;
    addOrderItems.mockResolvedValueOnce({});
    await config.mutationFn({
      orderId: "o1",
      items: [],
      combos: [],
      notes: "n",
      couponCode: "C",
      promotionIds: ["p"],
    });
    expect(addOrderItems).toHaveBeenLastCalledWith("o1", [], [], "n", {
      couponCode: "C",
      promotionIds: ["p"],
    });
    await config.mutationFn({ orderId: "o1", items: [], combos: [] });
    expect(addOrderItems).toHaveBeenLastCalledWith("o1", [], [], undefined, {});
    config.onSuccess({}, { orderId: "o1" });
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
    config.onError({ response: { data: { message: "bad" } } });
    config.onError({ response: {} });
    config.onError(null);
    expect(toast).toHaveBeenCalledWith({ title: "bad", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({ title: "Failed", tone: "danger" });
  });
});
