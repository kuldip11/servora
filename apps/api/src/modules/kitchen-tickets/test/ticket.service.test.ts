import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  getQueue,
  findById,
  findDetailedById,
  setStatus,
  publish,
  subscribeLocal,
  courseHandlerBox,
  findOrder,
  shouldHoldCourse,
  findAutoFireableHeldTickets,
  deductForOrderItems,
  stationFindById,
  stationList,
  writeAudit,
} = vi.hoisted(() => {
  const courseHandlerBox: { value?: (envelope: unknown) => Promise<void> } = {};
  return {
    getQueue: vi.fn(),
    findById: vi.fn(),
    findDetailedById: vi.fn(),
    setStatus: vi.fn(),
    publish: vi.fn(),
    subscribeLocal: vi.fn(
      (type: string, handler: (envelope: unknown) => Promise<void>) => {
        if (type === "kitchen.ticket.updated") courseHandlerBox.value = handler;
        return () => undefined;
      },
    ),
    courseHandlerBox,
    findOrder: vi.fn(),
    shouldHoldCourse: vi.fn(),
    findAutoFireableHeldTickets: vi.fn(),
    deductForOrderItems: vi.fn(),
    stationFindById: vi.fn(),
    stationList: vi.fn(),
    writeAudit: vi.fn(),
  };
});
vi.mock("../ticket.repository", () => ({
  ticketRepository: {
    getQueue,
    findById,
    findDetailedById,
    setStatus,
    shouldHoldCourse,
    findAutoFireableHeldTickets,
  },
}));
vi.mock("../../../lib/event-bus", () => ({
  eventBus: { publish, subscribe: subscribeLocal },
}));
vi.mock("../../inventory/inventory.service", () => ({
  inventoryService: { deductForOrderItemsWithRetry: deductForOrderItems },
}));
vi.mock("../stations/station.repository", () => ({
  stationRepository: { findById: stationFindById, list: stationList },
}));
vi.mock("../../../core/audit", () => ({ writeAudit }));
vi.mock("../../../db", () => ({
  db: { query: { orders: { findFirst: findOrder } } },
}));
import { ticketService } from "@/modules/kitchen-tickets/ticket.service";
const auth = (overrides: any = {}) => ({
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@example.com",
  roles: [],
  permissions: ["kitchen:read", "kitchen:update"],
  ...overrides,
});
const logger = { info: vi.fn() } as any;

beforeEach(() => {
  vi.clearAllMocks();
  findAutoFireableHeldTickets.mockResolvedValue([]);
  deductForOrderItems.mockResolvedValue({ short: [] });
  writeAudit.mockResolvedValue(undefined);
});

describe("ticket service", () => {
  it("requires permission and a branch to read the queue", async () => {
    await expect(
      ticketService.getQueueForCurrentBranch(auth({ permissions: [] })),
    ).rejects.toThrow(/Insufficient permissions|access denied/);
    await expect(
      ticketService.getQueueForCurrentBranch(auth({ branchId: null })),
    ).rejects.toMatchObject({ code: "MISSING_BRANCH" });
    getQueue.mockResolvedValue([{ id: "t1" }]);
    await expect(
      ticketService.getQueueForCurrentBranch(auth()),
    ).resolves.toEqual([{ id: "t1" }]);
  });
  it("maps missing tickets and invalid transitions before mutating", async () => {
    findById.mockResolvedValue(undefined);
    await expect(
      ticketService.updateStatus(auth(), logger, "t1", "READY"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    findById.mockResolvedValue({ id: "t1", branchId: "b1", status: "FIRED" });
    await expect(
      ticketService.updateStatus(auth(), logger, "t1", "READY"),
    ).rejects.toThrow("Cannot transition");
  });

  it("allows order-status staff to mark a ready ticket served but not perform kitchen transitions", async () => {
    const current = { id: "t1", branchId: "b1", status: "READY" };
    const detailed = {
      ...current,
      status: "SERVED",
      orderId: "o1",
      items: [],
      order: { id: "o1", table: null },
    };
    findById.mockResolvedValue(current);
    setStatus.mockResolvedValue({ ...current, status: "SERVED" });
    findDetailedById.mockResolvedValue(detailed);
    findOrder.mockResolvedValue({ customerSessionId: null });
    publish.mockResolvedValue(undefined);

    await expect(
      ticketService.updateStatus(
        auth({ roles: ["WAITER"], permissions: ["orders:update_status"] }),
        logger,
        "t1",
        "SERVED",
      ),
    ).resolves.toEqual(detailed);

    await expect(
      ticketService.updateStatus(
        auth({ roles: ["WAITER"], permissions: ["orders:update_status"] }),
        logger,
        "t1",
        "PREPARING",
      ),
    ).rejects.toThrow(/Insufficient permissions/);
  });
  it("updates status, logs, and publishes the domain event", async () => {
    const current = { id: "t1", branchId: "b1", status: "PREPARING" };
    const updated = { ...current, status: "READY", orderId: "o1" };
    const detailed = {
      ...updated,
      items: [{ id: "i1", modifiers: [] }],
      order: { id: "o1", table: null },
    };
    findById.mockResolvedValue(current);
    setStatus.mockResolvedValue(updated);
    findOrder.mockResolvedValue({ customerSessionId: "cs1" });
    findDetailedById.mockResolvedValue(detailed);
    publish.mockResolvedValue(undefined);
    await expect(
      ticketService.updateStatus(auth(), logger, "t1", "READY"),
    ).resolves.toEqual(detailed);
    expect(logger.info).toHaveBeenCalledWith(
      "Kitchen ticket status updated",
      expect.objectContaining({
        ticketId: "t1",
        from: "PREPARING",
        to: "READY",
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "kitchen.ticket.updated",
        payload: expect.objectContaining({
          ...detailed,
          customerSessionId: "cs1",
        }),
      }),
      "t1",
      "b1",
      expect.objectContaining({ userId: "u1" }),
    );
  });
  it("fires a held course manually and deducts inventory only when it becomes FIRED", async () => {
    const current = {
      id: "t2",
      branchId: "b1",
      orderId: "o1",
      status: "HELD",
      course: { courseNumber: 2 },
    };
    const detailed = {
      ...current,
      status: "FIRED",
      items: [
        {
          id: "i2",
          menuItemId: "m2",
          variantId: null,
          quantity: 1,
          modifiers: [],
        },
      ],
      order: { id: "o1", table: null },
    };
    findById.mockResolvedValue(current);
    setStatus.mockResolvedValue({ ...current, status: "FIRED" });
    findDetailedById.mockResolvedValue(detailed);
    findOrder.mockResolvedValue({ customerSessionId: null });
    await ticketService.updateStatus(auth(), logger, "t2", "FIRED");
    expect(deductForOrderItems).toHaveBeenCalledTimes(1);
    expect(deductForOrderItems).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "t2",
      [expect.objectContaining({ orderItemId: "i2", menuItemId: "m2" })],
      "u1",
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "KITCHEN_COURSE_MANUALLY_FIRED",
        entityId: "t2",
      }),
    );
  });

  it("auto-fires the next held course after the previous course is served", async () => {
    const served = {
      id: "t1",
      branchId: "b1",
      orderId: "o1",
      status: "READY",
      course: { courseNumber: 1 },
    };
    const held = {
      id: "t2",
      branchId: "b1",
      orderId: "o1",
      status: "HELD",
      course: { courseNumber: 2 },
    };
    findById.mockResolvedValue(served);
    setStatus
      .mockResolvedValueOnce({ ...served, status: "SERVED" })
      .mockResolvedValueOnce({ ...held, status: "FIRED" });
    findDetailedById
      .mockResolvedValueOnce({
        ...served,
        status: "SERVED",
        items: [],
        order: { id: "o1", table: null },
      })
      .mockResolvedValueOnce({
        ...held,
        status: "FIRED",
        items: [
          {
            id: "i2",
            menuItemId: "m2",
            variantId: null,
            quantity: 1,
            modifiers: [],
          },
        ],
        order: { id: "o1", table: null },
      });
    findOrder.mockResolvedValue({ customerSessionId: null });
    findAutoFireableHeldTickets.mockResolvedValue([held]);
    await ticketService.updateStatus(auth(), logger, "t1", "SERVED");
    expect(setStatus).toHaveBeenCalledTimes(1);
    expect(courseHandlerBox.value).toBeDefined();
    await courseHandlerBox.value?.({
      event: {
        type: "kitchen.ticket.updated",
        payload: { ...served, status: "SERVED", orderId: "o1" },
      },
      tenantId: "t1",
      branchId: "b1",
      context: { userId: "u1" },
    });
    expect(setStatus).toHaveBeenNthCalledWith(
      2,
      "t1",
      "t2",
      "FIRED",
      expect.objectContaining({ firedAt: expect.any(Date) }),
    );
    expect(deductForOrderItems).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "KITCHEN_COURSE_AUTO_FIRED",
        entityId: "t2",
      }),
    );
  });

  it("enforces resource branch access", async () => {
    findById.mockResolvedValue({
      id: "t1",
      branchId: "b2",
      status: "PREPARING",
    });
    await expect(
      ticketService.updateStatus(auth(), logger, "t1", "READY"),
    ).rejects.toThrow(/Insufficient permissions|access denied/);
  });
});
