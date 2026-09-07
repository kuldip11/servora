import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutationConfigs, qc, toast, updateTicketStatus } = vi.hoisted(() => ({
  mutationConfigs: [] as any[],
  qc: { invalidateQueries: vi.fn() },
  toast: vi.fn(),
  updateTicketStatus: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/features/orders/api/orders", () => ({ updateTicketStatus }));
import { useUpdateTicketStatus } from "../useUpdateTicketStatus";

beforeEach(() => {
  mutationConfigs.length = 0;
  vi.clearAllMocks();
});

describe("useUpdateTicketStatus", () => {
  it("updates ticket status and covers error-message fallbacks", async () => {
    useUpdateTicketStatus();
    const config = mutationConfigs.at(-1)!;
    await config.mutationFn({ ticketId: "k1", status: "READY" });
    config.onSuccess();
    config.onError({ response: { data: { message: "ticket bad" } } });
    config.onError({ response: { data: { message: 5 } } });
    config.onError(undefined);
    expect(toast).toHaveBeenCalledWith({ title: "ticket bad", tone: "danger" });
    expect(toast).toHaveBeenCalledWith({
      title: "Failed to update ticket",
      tone: "danger",
    });
  });
});
