import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, qc, toast, api, extractApiError } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  qc: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  toast: vi.fn(),
  api: { compOrderItem: vi.fn(), voidOrderItem: vi.fn() },
  extractApiError: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@pos/api-client", () => ({ extractApiError }));
vi.mock("@/features/orders/api/orders", () => api);
import { useLineAdjustments } from "../useLineAdjustments";

beforeEach(() => {
  mutationConfigs.length = 0;
  vi.clearAllMocks();
});

describe("useLineAdjustments", () => {
  it("handles void, comp, success, and error branches", async () => {
    extractApiError
      .mockReturnValueOnce("Manager approval required")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("boom");
    useLineAdjustments("o1");
    const config = mutationConfigs.at(-1)!;
    await config.mutationFn({ itemId: "i1", action: "void", reason: "r" });
    await config.mutationFn({
      itemId: "i2",
      action: "comp",
      approvalToken: "a",
    });
    expect(api.voidOrderItem).toHaveBeenCalled();
    expect(api.compOrderItem).toHaveBeenCalled();
    config.onSuccess({ id: "o1" });
    config.onError(new Error("a"));
    config.onError(new Error("b"));
    config.onError(new Error("c"));
    expect(toast).toHaveBeenCalledWith({
      title: "Failed to update item",
      tone: "danger",
    });
    expect(toast).toHaveBeenCalledWith({ title: "boom", tone: "danger" });
  });
});
