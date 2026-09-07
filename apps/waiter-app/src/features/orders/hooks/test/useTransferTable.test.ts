import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, qc, toast, transferOrderTable } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  qc: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  toast: vi.fn(),
  transferOrderTable: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/features/orders/api/orders", () => ({ transferOrderTable }));
import { useTransferTable } from "../useTransferTable";

beforeEach(() => {
  mutationConfigs.length = 0;
  vi.clearAllMocks();
});

describe("useTransferTable", () => {
  it("transfers, updates cache on success, and handles errors", async () => {
    useTransferTable("o1");
    const config = mutationConfigs.at(-1)!;
    await config.mutationFn({ newTableId: "t2", reason: "move" });
    config.onSuccess({ id: "o1" });
    config.onError();
    expect(transferOrderTable).toHaveBeenCalledWith("o1", "t2", "move");
  });
});
