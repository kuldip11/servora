import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOrder: vi.fn(),
  findRequest: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  selectFrom: vi.fn(),
  selectWhere: vi.fn(),
  selectOrderBy: vi.fn(),
  publish: vi.fn(),
  allServed: vi.fn(),
}));

vi.mock("@/modules/customer/customer.service", () => ({
  customerService: { getSession: mocks.getSession },
}));
vi.mock("@/lib/event-bus", () => ({
  eventBus: { publish: mocks.publish },
}));
vi.mock("@/modules/kitchen-tickets/ticket.repository", () => ({
  ticketRepository: { allServed: mocks.allServed },
}));
vi.mock("@/db", () => ({
  db: {
    query: {
      orders: { findFirst: mocks.findOrder },
      customerRequests: { findFirst: mocks.findRequest },
    },
    insert: vi.fn(() => ({ values: mocks.insertValues })),
    update: vi.fn(() => ({ set: mocks.updateSet })),
    select: vi.fn(() => ({ from: mocks.selectFrom })),
  },
}));

import { customerRequestService } from "@/modules/customer/customer-requests";

const session = {
  id: "s1",
  tenantId: "t1",
  branchId: "b1",
  tableId: "table1",
};

const auth = (overrides: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
    branchId: "b1",
    tenantWide: false,
    permissions: ["orders:read", "orders:update"],
    roles: [],
    ...overrides,
  }) as AuthContext;

describe("customerRequestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(session);
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insertReturning.mockResolvedValue([
      {
        id: "r1",
        tenantId: "t1",
        branchId: "b1",
        tableId: "table1",
        status: "OPEN",
        type: "WATER",
      },
    ]);
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateReturning.mockResolvedValue([
      { id: "r1", tenantId: "t1", branchId: "b1", status: "ACKNOWLEDGED" },
    ]);
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.selectWhere.mockReturnValue({ orderBy: mocks.selectOrderBy });
    mocks.selectOrderBy.mockResolvedValue([{ id: "r1" }]);
    mocks.publish.mockResolvedValue(undefined);
    mocks.allServed.mockResolvedValue(false);
  });

  it("rejects requests without a dine-in table", async () => {
    mocks.getSession.mockResolvedValue({ ...session, tableId: null });
    await expect(
      customerRequestService.create("tok", { type: "WATER" }),
    ).rejects.toThrow(
      "Customer requests are only available for dine-in sessions",
    );
  });

  it("validates an attached order belongs to the session", async () => {
    mocks.findOrder.mockResolvedValueOnce(undefined);
    await expect(
      customerRequestService.create("tok", { type: "WATER", orderId: "o1" }),
    ).rejects.toThrow("Order does not belong to this customer session");
  });

  it("rejects when persistence does not return the created request", async () => {
    mocks.insertReturning.mockResolvedValueOnce([]);
    await expect(
      customerRequestService.create("tok", { type: "WATER" }),
    ).rejects.toThrow("Unable to create customer request");
  });

  it("creates and publishes a normal customer request", async () => {
    const result = await customerRequestService.create("tok", {
      type: "WATER",
      note: "cold",
    });
    expect(result.id).toBe("r1");
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: null, note: "cold" }),
    );
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "customer.request.created" }),
      "t1",
      "b1",
    );
  });

  it("moves an open fully-served order to bill requested and publishes both events", async () => {
    mocks.findOrder
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce({ id: "o1", status: "OPEN" });
    mocks.allServed.mockResolvedValueOnce(true);
    mocks.updateReturning.mockResolvedValueOnce([
      { id: "o1", status: "BILL_REQUESTED" },
    ]);

    await customerRequestService.create("tok", { type: "BILL", orderId: "o1" });

    expect(mocks.allServed).toHaveBeenCalledWith("t1", "o1");
    expect(mocks.publish).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "order.updated" }),
      "t1",
      "b1",
    );
    expect(mocks.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "customer.request.created" }),
      "t1",
      "b1",
    );
  });

  it("does not move a bill order when tickets are not served, order is closed, or update races", async () => {
    mocks.findOrder
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce({ id: "o1", status: "OPEN" });
    mocks.allServed.mockResolvedValueOnce(false);
    await customerRequestService.create("tok", { type: "BILL", orderId: "o1" });
    expect(mocks.updateSet).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(session);
    mocks.findOrder
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce({ id: "o1", status: "PAID" });
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insertReturning.mockResolvedValue([
      { id: "r2", tenantId: "t1", branchId: "b1" },
    ]);
    mocks.publish.mockResolvedValue(undefined);
    await customerRequestService.create("tok", { type: "BILL", orderId: "o1" });
    expect(mocks.allServed).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(session);
    mocks.findOrder
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce({ id: "o1", status: "OPEN" });
    mocks.allServed.mockResolvedValue(true);
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
    mocks.insertReturning.mockResolvedValue([
      { id: "r3", tenantId: "t1", branchId: "b1" },
    ]);
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateReturning.mockResolvedValue([]);
    mocks.publish.mockResolvedValue(undefined);
    await customerRequestService.create("tok", { type: "BILL", orderId: "o1" });
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });

  it("enforces read permission and supports tenant-wide and branch staff lists", async () => {
    await expect(
      customerRequestService.listForStaff(auth({ permissions: [] })),
    ).rejects.toThrow("Insufficient permissions");

    await expect(
      customerRequestService.listForStaff(
        auth({ tenantWide: true, branchId: null }),
      ),
    ).resolves.toEqual([{ id: "r1" }]);
    await expect(customerRequestService.listForStaff(auth())).resolves.toEqual([
      { id: "r1" },
    ]);
    expect(mocks.selectOrderBy).toHaveBeenCalledTimes(2);
  });

  it("enforces update permission, existence, branch scope, and no reopen", async () => {
    await expect(
      customerRequestService.updateForStaff(
        auth({ permissions: [] }),
        "r1",
        "ACKNOWLEDGED",
      ),
    ).rejects.toThrow("Insufficient permissions");

    mocks.findRequest.mockResolvedValueOnce(undefined);
    await expect(
      customerRequestService.updateForStaff(auth(), "r1", "ACKNOWLEDGED"),
    ).rejects.toThrow("Customer request not found");

    mocks.findRequest.mockResolvedValueOnce({
      id: "r1",
      tenantId: "t1",
      branchId: "b2",
    });
    await expect(
      customerRequestService.updateForStaff(auth(), "r1", "ACKNOWLEDGED"),
    ).rejects.toThrow("Customer request branch access denied");

    mocks.findRequest.mockResolvedValueOnce({
      id: "r1",
      tenantId: "t1",
      branchId: "b1",
    });
    await expect(
      customerRequestService.updateForStaff(auth(), "r1", "OPEN"),
    ).rejects.toThrow("A request cannot be reopened");
  });

  it("updates a request and publishes the update for permitted staff", async () => {
    mocks.findRequest.mockResolvedValueOnce({
      id: "r1",
      tenantId: "t1",
      branchId: "b1",
    });
    const result = await customerRequestService.updateForStaff(
      auth(),
      "r1",
      "ACKNOWLEDGED",
    );
    expect(result).toEqual(expect.objectContaining({ status: "ACKNOWLEDGED" }));
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "customer.request.updated" }),
      "t1",
      "b1",
    );
  });
});
