import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  useMutation: vi.fn((config: unknown) => config),
}));
const queryClient = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const notify = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
const ordersService = vi.hoisted(() => ({ updateTicketStatus: vi.fn() }));

vi.mock("@tanstack/react-query", () => query);
vi.mock("../../../../shared/lib/query-client", () => ({ queryClient }));
vi.mock("../../../../shared/lib/notify", () => notify);
vi.mock("../../services/orders.service", () => ({ ordersService }));
vi.mock("../../query-keys", () => ({
  orderKeys: { all: ["orders"], detail: (id: string) => ["orders", id] },
}));

import { useUpdateTicketStatus } from "@/features/orders/hooks/useUpdateTicketStatus";

describe("useUpdateTicketStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates tickets and invalidates order queries on success", () => {
    const mutation: any = useUpdateTicketStatus("o1");
    mutation.mutationFn({ ticketId: "t1", status: "READY" });
    mutation.onSuccess();

    expect(ordersService.updateTicketStatus).toHaveBeenCalledWith(
      "t1",
      "READY",
    );
    expect(notify.notifySuccess).toHaveBeenCalledWith("Ticket updated");
  });

  it("reports ticket update errors", () => {
    const mutation: any = useUpdateTicketStatus("o1");
    const error = new Error("boom");
    mutation.onError(error);

    expect(notify.notifyError).toHaveBeenCalledWith(
      error,
      "Failed to update ticket",
    );
  });
});
