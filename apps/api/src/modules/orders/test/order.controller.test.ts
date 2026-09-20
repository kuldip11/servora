import { beforeEach, describe, expect, it, vi } from "vitest";
const svc = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  getInventoryImpact: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  fireTicket: vi.fn(),
  voidItem: vi.fn(),
  compItem: vi.fn(),
  refireItem: vi.fn(),
  refillItem: vi.fn(),
  transferTable: vi.fn(),
  mergeOrders: vi.fn(),
}));
const explainOrder = vi.hoisted(() => vi.fn());
vi.mock("../order.service", () => ({ orderService: svc }));
vi.mock("@/modules/menu/explain/order-explain.service", () => ({
  orderExplainService: { explainOrder },
}));
import { orderController } from "../order.controller";
const auth: any = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  permissions: [],
};
beforeEach(() => {
  vi.clearAllMocks();
});
const now = new Date("2026-09-18T00:00:00.000Z");
const dbOrder = (id = "00000000-0000-4000-8000-000000000001") => ({
  id,
  mergedIntoOrderId: null,
  tenantId: "00000000-0000-4000-8000-000000000002",
  branchId: "00000000-0000-4000-8000-000000000003",
  tableId: null,
  table: null,
  customerId: null,
  customerGroupId: null,
  status: "OPEN",
  type: "TAKEAWAY",
  billingMode: "LINE_ITEMS",
  coverCount: null,
  perCoverPriceRuleId: null,
  perCoverRate: null,
  subtotal: "100.00",
  taxAmount: "5.00",
  discountAmount: "0.00",
  serviceChargeAmount: "0.00",
  roundingAdjustment: "0.00",
  totalAmount: "105.00",
  notes: null,
  resolutionAsOf: now,
  items: [],
  kitchenTickets: [],
  statusHistory: [],
  payments: [],
  createdAt: now,
  updatedAt: now,
  createdBy: null,
  source: "STAFF",
  customerSessionId: null,
  createdByUser: null,
  bills: [],
});

const orderDto = (id = "00000000-0000-4000-8000-000000000001") => ({
  id,
  mergedIntoOrderId: null,
  tenantId: "00000000-0000-4000-8000-000000000002",
  branchId: "00000000-0000-4000-8000-000000000003",
  tableId: null,
  table: null,
  customerId: null,
  customerGroupId: null,
  status: "OPEN",
  type: "TAKEAWAY",
  billingMode: "LINE_ITEMS",
  coverCount: null,
  perCoverPriceRuleId: null,
  perCoverRate: null,
  subtotal: 100,
  taxAmount: 5,
  discountAmount: 0,
  serviceChargeAmount: 0,
  roundingAdjustment: 0,
  totalAmount: 105,
  notes: null,
  resolutionAsOf: now.toISOString(),
  items: [],
  kitchenTickets: [],
  statusHistory: [],
  payments: [],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

const orderListDto = (id = "00000000-0000-4000-8000-000000000001") => {
  const { statusHistory: _statusHistory, ...summary } = orderDto(id);
  return summary;
};

describe("order controller", () => {
  it("wraps explain, list, detail and inventory responses", async () => {
    explainOrder.mockResolvedValue({ id: "o1" });
    svc.list.mockResolvedValue({
      items: [dbOrder()],
      total: 26,
      page: 1,
      limit: 25,
    });
    svc.getById.mockResolvedValue(dbOrder());
    svc.getInventoryImpact.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000010",
        orderId: "00000000-0000-4000-8000-000000000001",
        kitchenTicketId: null,
        orderItemId: null,
        menuItemId: "00000000-0000-4000-8000-000000000011",
        inventoryItemId: "00000000-0000-4000-8000-000000000012",
        quantityDeducted: "2.500",
        unit: "KG",
        wasShort: false,
        deductedAt: now,
        reversedAt: null,
        inventoryItem: {
          id: "00000000-0000-4000-8000-000000000012",
          name: "Flour",
        },
        menuItem: { id: "00000000-0000-4000-8000-000000000011", name: "Bread" },
      },
    ]);
    expect(await orderController.explain(auth, "o1")).toEqual({
      success: true,
      data: { id: "o1" },
    });
    expect(await orderController.list(auth, { status: "OPEN" })).toEqual({
      success: true,
      data: [orderListDto()],
      pagination: { total: 26, page: 1, limit: 25, hasMore: true },
    });
    expect(await orderController.getById(auth, "o1")).toEqual({
      success: true,
      data: orderDto(),
    });
    expect(await orderController.getInventoryImpact(auth, "o1")).toEqual({
      success: true,
      data: [
        {
          id: "00000000-0000-4000-8000-000000000010",
          orderId: "00000000-0000-4000-8000-000000000001",
          kitchenTicketId: null,
          orderItemId: null,
          menuItemId: "00000000-0000-4000-8000-000000000011",
          inventoryItemId: "00000000-0000-4000-8000-000000000012",
          quantityDeducted: 2.5,
          unit: "KG",
          wasShort: false,
          deductedAt: now.toISOString(),
          reversedAt: null,
          inventoryItem: {
            id: "00000000-0000-4000-8000-000000000012",
            name: "Flour",
          },
          menuItem: {
            id: "00000000-0000-4000-8000-000000000011",
            name: "Bread",
          },
        },
      ],
    });
  });
  it("delegates create/status/fire and item mutations", async () => {
    for (const fn of [
      svc.create,
      svc.updateStatus,
      svc.fireTicket,
      svc.voidItem,
      svc.compItem,
      svc.refireItem,
      svc.refillItem,
    ])
      fn.mockResolvedValue(dbOrder());
    expect(
      await orderController.create(auth, {
        type: "TAKEAWAY",
        items: [],
      } as any),
    ).toEqual({ success: true, data: orderDto() });
    await orderController.updateStatus(auth, "o1", "PAID", "r", "c1", "unused");
    expect(svc.updateStatus).toHaveBeenCalledWith(
      auth,
      "o1",
      "PAID",
      "r",
      "c1",
    );
    await orderController.fireTicket(auth, "o1", { items: [] } as any);
    await orderController.voidItem(auth, "o1", "i1", "r", "c1", "ap");
    expect(svc.voidItem).toHaveBeenCalledWith(
      auth,
      "o1",
      "i1",
      "r",
      "c1",
      "ap",
    );
    await orderController.compItem(
      auth,
      "o1",
      "i1",
      undefined,
      undefined,
      "ap",
    );
    expect(svc.compItem).toHaveBeenCalledWith(
      auth,
      "o1",
      "i1",
      undefined,
      undefined,
      "ap",
    );
    await orderController.refireItem(auth, "o1", "i1", "again");
    expect(svc.refireItem).toHaveBeenLastCalledWith(
      auth,
      "o1",
      "i1",
      "again",
      true,
    );
    await orderController.refireItem(auth, "o1", "i1", "again", false);
    expect(svc.refireItem).toHaveBeenLastCalledWith(
      auth,
      "o1",
      "i1",
      "again",
      false,
    );
    await orderController.refillItem(auth, "o1", "i1");
  });
  it("delegates transfer and merge", async () => {
    svc.transferTable.mockResolvedValue(dbOrder());
    const source = dbOrder("00000000-0000-4000-8000-000000000021");
    const target = dbOrder("00000000-0000-4000-8000-000000000022");
    svc.mergeOrders.mockResolvedValue({ source, target });
    await expect(
      orderController.transferTable(auth, "o1", "t2", "move"),
    ).resolves.toMatchObject({ data: orderDto() });
    expect(svc.transferTable).toHaveBeenCalledWith(auth, "o1", "t2", "move");
    await expect(
      orderController.mergeOrders(auth, "o1", "o2"),
    ).resolves.toEqual({
      success: true,
      data: { source: orderDto(source.id), target: orderDto(target.id) },
    });
    expect(svc.mergeOrders).toHaveBeenCalledWith(auth, "o1", "o2");
  });
});
