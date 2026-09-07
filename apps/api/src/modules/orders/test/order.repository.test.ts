import { beforeEach, describe, expect, it, vi } from "vitest";
const { tx, db } = vi.hoisted(() => {
  const tx: any = { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
  const db: any = {
    transaction: vi.fn(async (fn: any) => fn(tx)),
    select: vi.fn(),
    query: { orders: { findFirst: vi.fn(), findMany: vi.fn() } },
  };
  return { tx, db };
});
vi.mock("../../../db", () => ({ db }));
vi.mock("../../menu/promotions/promotion.repository", () => ({
  assertAndInsertPromotionRedemptions: vi.fn().mockResolvedValue(undefined),
  assertAndReplacePromotionRedemptions: vi.fn().mockResolvedValue(undefined),
}));
import { orderRepository } from "@/modules/orders/order.repository";

const returning = (rows: any[]) => vi.fn().mockResolvedValue(rows);
const valuesReturning = (rows: any[]) => ({
  values: vi.fn().mockReturnValue({ returning: returning(rows) }),
});
const item = {
  menuItemId: "m1",
  menuItemName: "Pizza",
  quantity: 1,
  unitPrice: 10,
  subtotal: 10,
  taxRate: 15,
  pricingAttribution: { BASE_PRICE: 10, VARIANT: 0, MODIFIER: 0 },
  modifiers: [],
  stationId: "station-1",
  menuChangeEventId: "event-1",
} as any;

beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.mockImplementation(async (fn: any) => fn(tx));
  db.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total: 0 }]),
    }),
  });
  tx.query = {
    menuItemVariants: { findFirst: vi.fn().mockResolvedValue(undefined) },
    menuItems: {
      findFirst: vi.fn().mockResolvedValue({ manualStockCount: null }),
    },
    kitchenTickets: { findFirst: vi.fn().mockResolvedValue(undefined) },
  };
});

describe("order repository", () => {
  it("creates an order, first kitchen ticket, items, and OPEN history transactionally", async () => {
    tx.insert
      .mockReturnValueOnce(valuesReturning([{ id: "o1" }]))
      .mockReturnValueOnce(valuesReturning([{ id: "t1" }]))
      .mockReturnValueOnce(valuesReturning([{ id: "oi1" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    const result = await orderRepository.create({
      tenantId: "t1",
      branchId: "b1",
      createdBy: "u1",
      type: "TAKEAWAY",
      items: [item],
      subtotal: 10,
      taxAmount: 1.5,
      totalAmount: 11.5,
    });
    expect(result).toEqual({ id: "o1" });
    expect(tx.insert).toHaveBeenCalledTimes(4);
  });

  it("persists and reads promotion attribution on order lines without losing detail", async () => {
    const attributedItem = {
      ...item,
      pricingAttribution: {
        BASE_PRICE: 10,
        VARIANT: 0,
        MODIFIER: 0,
        PROMOTION: -2,
        PROMOTION_DETAILS: [
          { promotionId: "promo-1", name: "20% off", discountAmount: 2 },
        ],
      },
    };
    const itemInsert = valuesReturning([{ id: "oi-attributed" }]);
    tx.insert
      .mockReturnValueOnce(valuesReturning([{ id: "o-attributed" }]))
      .mockReturnValueOnce(valuesReturning([{ id: "t-attributed" }]))
      .mockReturnValueOnce(itemInsert)
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });

    await orderRepository.create({
      tenantId: "t1",
      branchId: "b1",
      createdBy: "u1",
      type: "TAKEAWAY",
      items: [attributedItem],
      subtotal: 10,
      taxAmount: 0.4,
      discountAmount: 2,
      totalAmount: 8.4,
    });
    expect(itemInsert.values).toHaveBeenCalledWith([
      expect.objectContaining({
        pricingAttribution: attributedItem.pricingAttribution,
      }),
    ]);

    db.query.orders.findFirst.mockResolvedValue({
      id: "o-attributed",
      tenantId: "t1",
      items: [
        {
          id: "oi-attributed",
          pricingAttribution: attributedItem.pricingAttribution,
        },
      ],
    });
    await expect(
      orderRepository.findById("t1", "o-attributed"),
    ).resolves.toMatchObject({
      items: [{ pricingAttribution: attributedItem.pricingAttribution }],
    });
  });

  it("returns tenant-scoped reads and undefined when an update target is absent", async () => {
    db.query.orders.findFirst.mockResolvedValue({
      id: "o1",
      tenantId: "t1",
      branchId: "b1",
    });
    await expect(orderRepository.findById("t1", "o1")).resolves.toMatchObject({
      id: "o1",
    });
    db.query.orders.findMany.mockResolvedValue([]);
    await expect(
      orderRepository.findMany("t1", "b1", { status: "OPEN", type: "DINE_IN" }),
    ).resolves.toEqual({ items: [], total: 0, page: 1, limit: 25 });
    expect(db.query.orders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        with: expect.objectContaining({
          items: {
            columns: {
              availabilitySnapshot: false,
              pricingReplayEvidence: false,
              availabilityReplayEvidence: false,
            },
          },
        }),
      }),
    );
    tx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    await expect(
      orderRepository.updateStatus("t1", "missing", "PAID", "u1"),
    ).resolves.toBeUndefined();
  });
  it("E5 void reverses every persisted multi-source deduction row exactly once", async () => {
    const deductionRows = [
      {
        id: "d-variant",
        orderItemId: "oi1",
        inventoryItemId: "inv-variant",
        quantityDeducted: "1.250",
      },
      {
        id: "d-modifier",
        orderItemId: "oi1",
        inventoryItemId: "inv-modifier",
        quantityDeducted: "0.500",
      },
      {
        id: "d-sub-recipe",
        orderItemId: "oi1",
        inventoryItemId: "inv-sub",
        quantityDeducted: "2.000",
      },
    ];
    tx.query = {
      orderItems: {
        findFirst: vi.fn().mockResolvedValue({
          id: "oi1",
          itemStatus: "ACTIVE",
          comboGroupId: null,
        }),
        findMany: vi.fn(),
      },
      orderInventoryDeductions: {
        findMany: vi.fn().mockResolvedValue(deductionRows),
      },
      inventoryItems: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: "inv-variant",
            tenantId: "t1",
            currentStock: "10",
          })
          .mockResolvedValueOnce({
            id: "inv-modifier",
            tenantId: "t1",
            currentStock: "20",
          })
          .mockResolvedValueOnce({
            id: "inv-sub",
            tenantId: "t1",
            currentStock: "30",
          }),
      },
      promotionRedemptions: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const stockSets: Array<Record<string, unknown>> = [];
    const deductionSets: Array<Record<string, unknown>> = [];
    tx.update.mockImplementation((table: unknown) => ({
      set: vi.fn((data: Record<string, unknown>) => {
        const chain = {
          where: vi.fn(() => {
            if ("itemStatus" in data) {
              return {
                returning: vi
                  .fn()
                  .mockResolvedValue([{ id: "oi1", itemStatus: "VOIDED" }]),
              };
            }
            if ("currentStock" in data) stockSets.push(data);
            if ("reversedAt" in data) deductionSets.push(data);
            return Promise.resolve(undefined);
          }),
        };
        return chain;
      }),
    }));

    const reversalTransactions: Array<Record<string, unknown>> = [];
    tx.insert.mockImplementation(() => ({
      values: vi.fn((data: Record<string, unknown>) => {
        reversalTransactions.push(data);
        return Promise.resolve(undefined);
      }),
    }));

    const result = await orderRepository.voidItem(
      "t1",
      "o1",
      "oi1",
      "u1",
      "mistake",
      undefined,
      {
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 0,
      },
    );

    expect(result).toMatchObject({
      voidedItemIds: ["oi1"],
      reversedInventoryItemIds: ["inv-variant", "inv-modifier", "inv-sub"],
    });
    expect(stockSets.map((entry) => entry.currentStock)).toEqual([
      "11.250",
      "20.500",
      "32.000",
    ]);
    expect(
      reversalTransactions.map((entry) => entry.reversalOfDeductionId),
    ).toEqual(["d-variant", "d-modifier", "d-sub-recipe"]);
    expect(deductionSets).toHaveLength(3);
  });

  it("creates later courses as HELD while keeping the first course FIRED", async () => {
    const orderInsert = valuesReturning([{ id: "course-order" }]);
    const course1Insert = valuesReturning([{ id: "course-1" }]);
    const ticket1Insert = valuesReturning([{ id: "ticket-1" }]);
    const items1Insert = valuesReturning([{ id: "line-1" }]);
    const course2Insert = valuesReturning([{ id: "course-2" }]);
    const ticket2Insert = valuesReturning([{ id: "ticket-2" }]);
    const items2Insert = valuesReturning([{ id: "line-2" }]);
    tx.insert
      .mockReturnValueOnce(orderInsert)
      .mockReturnValueOnce(course1Insert)
      .mockReturnValueOnce(ticket1Insert)
      .mockReturnValueOnce(items1Insert)
      .mockReturnValueOnce(course2Insert)
      .mockReturnValueOnce(ticket2Insert)
      .mockReturnValueOnce(items2Insert)
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    await orderRepository.create({
      tenantId: "t1",
      branchId: "b1",
      createdBy: "u1",
      type: "DINE_IN",
      items: [
        { ...item, courseNumber: 1 },
        { ...item, menuItemId: "m2", menuItemName: "Dessert", courseNumber: 2 },
      ],
      subtotal: 20,
      taxAmount: 3,
      totalAmount: 23,
    });
    expect(ticket1Insert.values).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FIRED", courseId: "course-1" }),
    );
    expect(ticket2Insert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "HELD",
        courseId: "course-2",
        firedAt: null,
      }),
    );
  });

  it("creates a refire sibling with lineage and can comp the original while keeping it REFIRED", async () => {
    tx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxTicket: 1 }]),
      }),
    });
    const ticketInsert = valuesReturning([{ id: "ticket-2" }]);
    const itemInsert = valuesReturning([{ id: "replacement" }]);
    tx.insert.mockReturnValueOnce(ticketInsert).mockReturnValueOnce(itemInsert);
    const sets: Array<Record<string, unknown>> = [];
    let updateCall = 0;
    tx.update.mockImplementation(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        sets.push(data);
        return {
          where: vi.fn(() => {
            updateCall += 1;
            if (updateCall === 1)
              return { returning: vi.fn().mockResolvedValue([{ id: "oi1" }]) };
            return Promise.resolve(undefined);
          }),
        };
      }),
    }));
    const result = await orderRepository.refireItem({
      tenantId: "t1",
      branchId: "b1",
      orderId: "o1",
      originalItemId: "oi1",
      item: {
        ...item,
        comboId: "combo-1",
        comboGroupId: "group-1",
        unitPrice: 8,
        subtotal: 8,
      },
      changedBy: "u1",
      reason: "burnt",
      compOriginal: true,
      absoluteTotals: {
        subtotal: 10,
        taxAmount: 1.5,
        discountAmount: 0,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 11.5,
      },
    });
    expect(result).toEqual({
      ticket: { id: "ticket-2" },
      replacement: { id: "replacement" },
    });
    expect(itemInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        refiresOrderItemId: "oi1",
        comboId: "combo-1",
        comboGroupId: "group-1",
        unitPrice: "8.00",
        subtotal: "8.00",
      }),
    );
    expect(sets).toContainEqual(
      expect.objectContaining({
        itemStatus: "REFIRED",
        compedAt: expect.any(Date),
        refireReason: "burnt",
      }),
    );
  });

  it("fires a new ticket and increments the ticket number", async () => {
    tx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxTicket: 2 }]),
      }),
    });
    tx.insert
      .mockReturnValueOnce(valuesReturning([{ id: "t3" }]))
      .mockReturnValueOnce(valuesReturning([{ id: "oi3" }]))
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    tx.update.mockReturnValue({
      set: vi
        .fn()
        .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    await expect(
      orderRepository.fireNewTicket("t1", "b1", "o1", [item], 10, 1, "more"),
    ).resolves.toEqual({ id: "t3" });
    expect(tx.insert.mock.calls[0][0]).toBeDefined();
  });
});

describe("G4 atomic manual-stock depletion", () => {
  it("rejects the order when the compare-and-decrement loses the last-unit race", async () => {
    tx.query = {
      menuItemVariants: { findFirst: vi.fn().mockResolvedValue(undefined) },
      menuItems: {
        findFirst: vi.fn().mockResolvedValue({ manualStockCount: 1 }),
      },
    };
    tx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    });

    await expect(
      orderRepository.create({
        tenantId: "t1",
        branchId: "b1",
        createdBy: "u1",
        type: "TAKEAWAY",
        items: [item],
        subtotal: 10,
        taxAmount: 1.5,
        totalAmount: 11.5,
      }),
    ).rejects.toMatchObject({
      details: { reason: "MANUAL_STOCK_DEPLETED" },
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
