import { describe, expect, it, vi } from "vitest";
const { getQueueForCurrentBranch, updateStatus } = vi.hoisted(() => ({
  getQueueForCurrentBranch: vi.fn(),
  updateStatus: vi.fn(),
}));
vi.mock("../ticket.service", () => ({
  ticketService: { getQueueForCurrentBranch, updateStatus },
}));

vi.mock("../ticket.mapper", () => ({
  toKitchenQueueTicketResponse: (value: unknown) => value,
}));
vi.mock("../stations/station.mapper", () => ({
  toKitchenStationResponse: (value: unknown) => value,
}));
import { ticketController } from "@/modules/kitchen-tickets/ticket.controller";
const auth = { userId: "u1", tenantId: "t1", branchId: "b1" } as any;
const logger = { info: vi.fn() } as any;

describe("ticket controller", () => {
  it("wraps queue responses", async () => {
    getQueueForCurrentBranch.mockResolvedValue([{ id: "t1" }]);
    await expect(ticketController.getQueue(auth)).resolves.toEqual({
      success: true,
      data: [{ id: "t1" }],
    });
  });
  it("passes status updates through with auth and logger", async () => {
    updateStatus.mockResolvedValue({ id: "t1", status: "READY" });
    await expect(
      ticketController.updateStatus(auth, logger, "t1", "READY"),
    ).resolves.toEqual({ success: true, data: { id: "t1", status: "READY" } });
    expect(updateStatus).toHaveBeenCalledWith(auth, logger, "t1", "READY");
  });
});
