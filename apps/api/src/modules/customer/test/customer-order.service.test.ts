import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOpenOrderBySession: vi.fn(),
  findCustomerRequestTicket: vi.fn(),
  orderFindById: vi.fn(),
  orderCreate: vi.fn(),
  fireNewTicket: vi.fn(),
  price: vi.fn(),
  finalize: vi.fn(),
  priceCombos: vi.fn(),
  activeItemIds: vi.fn(),
  effectiveItem: vi.fn(),
  validateStock: vi.fn(),
  listRedemptions: vi.fn(),
  loyaltyByPhone: vi.fn(),
  snapshot: vi.fn(),
  finalizeWhole: vi.fn(),
  tableUpdate: vi.fn(),
  publish: vi.fn(),
  deduct: vi.fn(),
  initiateTakeawayPayment: vi.fn(),
}));

vi.mock("@/modules/customer/customer-session.service", () => ({
  customerSessionService: { getSession: mocks.getSession },
}));
vi.mock("@/modules/customer/customer.repository", () => ({
  customerRepository: {
    findOpenOrderBySession: mocks.findOpenOrderBySession,
    findCustomerRequestTicket: mocks.findCustomerRequestTicket,
  },
}));
vi.mock("@/modules/orders/order.repository", () => ({
  orderRepository: {
    findById: mocks.orderFindById,
    create: mocks.orderCreate,
    fireNewTicket: mocks.fireNewTicket,
  },
}));
vi.mock("@/modules/orders/pricing/pricing-pipeline", () => ({
  pricingPipeline: { price: mocks.price, finalize: mocks.finalize },
}));
vi.mock("@/modules/menu/combos/combo-order.service", () => ({
  priceComboOrders: mocks.priceCombos,
}));
vi.mock("@/modules/menu/menus/menu-resolver.service", () => ({
  menuResolver: { getActiveItemIds: mocks.activeItemIds },
}));
vi.mock("@/modules/menu/availability/availability.service", () => ({
  availabilityService: { getEffectiveItem: mocks.effectiveItem },
}));
vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {
    validateStock: mocks.validateStock,
    deductForOrderItems: mocks.deduct,
  },
}));
vi.mock("@/modules/menu/promotions/promotion.repository", () => ({
  promotionRepository: { listRedemptionsForOrder: mocks.listRedemptions },
}));
vi.mock("@/modules/loyalty/loyalty.repository", () => ({
  loyaltyRepository: { findCustomersByPhone: mocks.loyaltyByPhone },
}));
vi.mock("@/modules/orders/order-line-snapshot.service", () => ({
  snapshotOrderLines: mocks.snapshot,
}));
vi.mock("@/modules/orders/active-order-pricing", () => ({
  finalizeWholeActiveOrder: mocks.finalizeWhole,
}));
vi.mock("@/modules/tables/table.repository", () => ({
  tableRepository: { update: mocks.tableUpdate },
}));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: mocks.publish } }));
vi.mock("@/modules/customer/customer-payment.service", () => ({
  customerPaymentService: { initiateTakeawayPayment: mocks.initiateTakeawayPayment },
}));

import { customerOrderService } from "@/modules/customer/customer-order.service";

const dineSession = {
  id: "s1",
  tenantId: "t1",
  branchId: "b1",
  tableId: "table1",
  mode: "DINE_IN",
};

const line = {
  id: "line1",
  menuItemId: "mi1",
  variantId: null,
  quantity: 2,
  unitPrice: 10,
  subtotal: 20,
  modifiers: [],
};

const finalPricing = {
  lines: [line],
  subtotal: 20,
  discountAmount: 1,
  taxAmount: 2,
  serviceChargeAmount: 0.5,
  roundingAdjustment: 0,
  totalAmount: 21.5,
  redemptions: [],
};

const ticket = {
  id: "kt1",
  status: "FIRED",
  items: [
    {
      id: "oi1",
      menuItemId: "mi1",
      variantId: null,
      quantity: 2,
      modifiers: [
        { modifierId: "mod1", quantity: 1 },
        { modifierId: null, quantity: 1 },
      ],
    },
  ],
};

const fullOrder = {
  id: "o1",
  status: "OPEN",
  customerId: null,
  items: [],
  kitchenTickets: [ticket],
};

const existingOrder = {
  ...fullOrder,
  items: [
    {
      id: "old1",
      menuItemId: "mi-old",
      quantity: 1,
      status: "ACTIVE",
    },
  ],
};

describe("customerOrderService coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(dineSession);
    mocks.findOpenOrderBySession.mockResolvedValue(null);
    mocks.findCustomerRequestTicket.mockResolvedValue(null);
    mocks.orderFindById.mockResolvedValue(fullOrder);
    mocks.orderCreate.mockResolvedValue({ id: "o1" });
    mocks.fireNewTicket.mockResolvedValue(undefined);
    mocks.price.mockResolvedValue({ lines: [line] });
    mocks.priceCombos.mockResolvedValue({ lines: [] });
    mocks.activeItemIds.mockResolvedValue(new Set(["mi1"]));
    mocks.effectiveItem.mockResolvedValue({ effectiveStatus: "ACTIVE", isHidden: false });
    mocks.validateStock.mockResolvedValue({ valid: true, insufficient: [] });
    mocks.listRedemptions.mockResolvedValue([]);
    mocks.loyaltyByPhone.mockResolvedValue([]);
    mocks.finalize.mockResolvedValue(finalPricing);
    mocks.finalizeWhole.mockResolvedValue({
      ...finalPricing,
      existingPricingUpdates: [],
      newLines: [line],
    });
    mocks.snapshot.mockResolvedValue([line]);
    mocks.tableUpdate.mockResolvedValue({ id: "table1", status: "OCCUPIED" });
    mocks.publish.mockResolvedValue(undefined);
    mocks.deduct.mockResolvedValue(undefined);
    mocks.initiateTakeawayPayment.mockResolvedValue(undefined);
  });

  it("requires at least one item or combo", async () => {
    await expect(customerOrderService.createOrder("tok", {})).rejects.toThrow(
      "Order requires at least one item or combo",
    );
  });

  it("validates loyalty lookup cardinality and existing-customer conflicts", async () => {
    mocks.loyaltyByPhone.mockResolvedValueOnce([]);
    await expect(
      customerOrderService.createOrder("tok", {
        items: [{ menuItemId: "mi1", quantity: 1 }],
        loyaltyPhone: " 999 ",
      }),
    ).rejects.toThrow("No loyalty customer matches");

    mocks.loyaltyByPhone.mockResolvedValueOnce([{ id: "c1" }, { id: "c2" }]);
    await expect(
      customerOrderService.createOrder("tok", {
        items: [{ menuItemId: "mi1", quantity: 1 }],
        loyaltyPhone: "999",
      }),
    ).rejects.toThrow("ambiguous");

    mocks.findOpenOrderBySession.mockResolvedValue({ id: "o-existing" });
    mocks.orderFindById.mockResolvedValueOnce({ ...existingOrder, customerId: "c-old" });
    mocks.loyaltyByPhone.mockResolvedValueOnce([{ id: "c-new" }]);
    await expect(
      customerOrderService.createOrder("tok", {
        items: [{ menuItemId: "mi1", quantity: 1 }],
        loyaltyPhone: "999",
      }),
    ).rejects.toThrow("already linked to a different loyalty customer");
  });

  it("rejects items absent from active menu, inactive/hidden availability, and insufficient stock", async () => {
    mocks.activeItemIds.mockResolvedValueOnce(new Set());
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("not on an active menu");

    mocks.effectiveItem.mockResolvedValueOnce({ effectiveStatus: "INACTIVE", isHidden: false });
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("not available right now");

    mocks.effectiveItem.mockResolvedValueOnce({ effectiveStatus: "ACTIVE", isHidden: true });
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("not available right now");

    mocks.validateStock.mockResolvedValueOnce({
      valid: false,
      insufficient: [{ name: "Burger" }, { name: "Fries" }],
    });
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("Burger, Fries");
  });

  it("creates a dine-in order, occupies the table, publishes order/ticket, and deducts inventory", async () => {
    const result = await customerOrderService.createOrder(
      "tok",
      {
        items: [{ menuItemId: "mi1", quantity: 2 }],
        notes: "less spicy",
        couponCode: "SAVE",
      },
      "req1",
    );

    expect(result).toBe(fullOrder);
    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "CUSTOMER_QR",
        type: "DINE_IN",
        tableId: "table1",
        initialTicketStatus: "FIRED",
        customerRequestId: "req1",
      }),
    );
    expect(mocks.tableUpdate).toHaveBeenCalledWith("t1", "table1", { status: "OCCUPIED" });
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order.created" }),
      "t1",
      "b1",
    );
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "kitchen.ticket.created" }),
      "t1",
      "b1",
    );
    expect(mocks.deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      [
        expect.objectContaining({
          orderItemId: "oi1",
          selectedOptions: [{ optionId: "mod1", quantity: 1 }],
        }),
      ],
      null,
    );
  });

  it("creates takeaway orders payment-gated without firing kitchen or deducting inventory", async () => {
    mocks.getSession.mockResolvedValue({ ...dineSession, tableId: null, mode: "TAKEAWAY" });
    mocks.orderFindById.mockResolvedValue({
      ...fullOrder,
      kitchenTickets: [{ ...ticket, status: "PENDING_PAYMENT" }],
    });

    await customerOrderService.createOrder("tok", {
      items: [{ menuItemId: "mi1", quantity: 1 }],
      fulfillmentType: "DINE_IN",
    });

    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TAKEAWAY", initialTicketStatus: "PENDING_PAYMENT" }),
    );
    expect(mocks.initiateTakeawayPayment).toHaveBeenCalledWith("t1", "b1", "o1");
    expect(mocks.deduct).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "kitchen.ticket.created" }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("supports combo-only orders and ignores synthetic combo parent lines for menu/stock checks", async () => {
    mocks.price.mockResolvedValue({ lines: [] });
    mocks.priceCombos.mockResolvedValue({
      lines: [
        { ...line, id: "combo-parent", menuItemId: null },
        { ...line, id: "combo-child", menuItemId: "mi1" },
      ],
    });
    mocks.finalize.mockResolvedValue({
      ...finalPricing,
      lines: [{ ...line, id: "combo-child" }],
    });

    await customerOrderService.createOrder("tok", {
      combos: [{ comboId: "combo1", quantity: 1, selections: [] }],
    });

    expect(mocks.validateStock).toHaveBeenCalledWith("t1", "b1", [
      { menuItemId: "mi1", quantity: 2 },
    ]);
  });

  it("reprices an existing dine-in tab, retains promotions/customer, and fires a new round", async () => {
    mocks.findOpenOrderBySession.mockResolvedValue({ id: "o1" });
    mocks.orderFindById
      .mockResolvedValueOnce({ ...existingOrder, customerId: "c1" })
      .mockResolvedValueOnce(fullOrder);
    mocks.loyaltyByPhone.mockResolvedValue([{ id: "c1" }]);
    mocks.listRedemptions.mockResolvedValue([{ promotionId: "promo1" }]);
    mocks.finalizeWhole.mockResolvedValue({
      ...finalPricing,
      existingPricingUpdates: [{ id: "old1", unitPrice: "9.00" }],
      newLines: [line],
    });

    const result = await customerOrderService.createOrder(
      "tok",
      {
        items: [{ menuItemId: "mi1", quantity: 1 }],
        couponCode: "SAVE",
        loyaltyPhone: "999",
      },
      "req2",
    );

    expect(result).toBe(fullOrder);
    expect(mocks.finalizeWhole).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "c1" }),
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({
        couponCode: "SAVE",
        promotionIds: ["promo1"],
        customerId: "c1",
      }),
    );
    expect(mocks.fireNewTicket).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      expect.any(Array),
      20,
      2,
      undefined,
      "req2",
      expect.objectContaining({ replacePromotionRedemptions: true, customerId: "c1" }),
    );
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order.updated" }),
      "t1",
      "b1",
    );
  });

  it("rejects more ordering when existing order is billing or session is takeaway", async () => {
    mocks.findOpenOrderBySession.mockResolvedValue({ id: "o1" });
    mocks.orderFindById.mockResolvedValueOnce({ ...existingOrder, status: "BILL_REQUESTED" });
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("already being settled");

    mocks.getSession.mockResolvedValue({ ...dineSession, tableId: null, mode: "TAKEAWAY" });
    mocks.orderFindById.mockResolvedValueOnce({ ...existingOrder, status: "OPEN" });
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("takeaway order has already been submitted");
  });

  it("treats request-id duplicates and unique ticket races idempotently", async () => {
    mocks.findOpenOrderBySession.mockResolvedValue({ id: "o1" });
    mocks.orderFindById
      .mockResolvedValueOnce(existingOrder)
      .mockResolvedValueOnce(fullOrder);
    mocks.findCustomerRequestTicket.mockResolvedValueOnce({ id: "kt-old" });
    await customerOrderService.createOrder(
      "tok",
      { items: [{ menuItemId: "mi1", quantity: 1 }] },
      "same-request",
    );
    expect(mocks.fireNewTicket).not.toHaveBeenCalled();

    mocks.orderFindById
      .mockResolvedValueOnce(existingOrder)
      .mockResolvedValueOnce(fullOrder);
    mocks.findCustomerRequestTicket.mockResolvedValueOnce(null);
    mocks.fireNewTicket.mockRejectedValueOnce({ code: "23505" });
    await expect(
      customerOrderService.createOrder(
        "tok",
        { items: [{ menuItemId: "mi1", quantity: 1 }] },
        "race-request",
      ),
    ).resolves.toBe(fullOrder);
  });

  it("rethrows non-unique existing-round failures", async () => {
    mocks.findOpenOrderBySession.mockResolvedValue({ id: "o1" });
    mocks.orderFindById.mockResolvedValueOnce(existingOrder);
    mocks.fireNewTicket.mockRejectedValueOnce(new Error("db down"));
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("db down");
  });

  it("recovers from concurrent first-order creation and appends the round", async () => {
    const unique = { code: "23505" };
    mocks.orderCreate.mockRejectedValueOnce(unique);
    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o-concurrent" });
    mocks.orderFindById
      .mockResolvedValueOnce({ ...existingOrder, id: "o-concurrent", customerId: null })
      .mockResolvedValueOnce({ ...fullOrder, id: "o-concurrent" });
    mocks.listRedemptions.mockResolvedValue([{ promotionId: "p1" }]);

    const result = await customerOrderService.createOrder(
      "tok",
      { items: [{ menuItemId: "mi1", quantity: 1 }], couponCode: "C" },
      "req-concurrent",
    );

    expect(result).toEqual(expect.objectContaining({ id: "o-concurrent" }));
    expect(mocks.fireNewTicket).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o-concurrent",
      expect.any(Array),
      20,
      0,
      undefined,
      "req-concurrent",
      expect.objectContaining({ replacePromotionRedemptions: true }),
    );
  });

  it("handles concurrent duplicate submission, missing concurrent order, customer conflict, and nested unique race", async () => {
    const unique = { code: "23505" };
    mocks.orderCreate.mockRejectedValue(unique);

    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o2" });
    mocks.findCustomerRequestTicket.mockResolvedValueOnce({ id: "already" });
    mocks.orderFindById.mockResolvedValueOnce({ ...fullOrder, id: "o2" });
    await expect(
      customerOrderService.createOrder(
        "tok",
        { items: [{ menuItemId: "mi1", quantity: 1 }] },
        "dup",
      ),
    ).resolves.toEqual(expect.objectContaining({ id: "o2" }));

    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toBe(unique);

    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o3" });
    mocks.loyaltyByPhone.mockResolvedValueOnce([{ id: "c-new" }]);
    mocks.orderFindById.mockResolvedValueOnce({ ...existingOrder, id: "o3", customerId: "c-old" });
    await expect(
      customerOrderService.createOrder("tok", {
        items: [{ menuItemId: "mi1", quantity: 1 }],
        loyaltyPhone: "999",
      }),
    ).rejects.toThrow("already linked to a different loyalty customer");

    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o4" });
    mocks.loyaltyByPhone.mockResolvedValue([]);
    mocks.orderFindById
      .mockResolvedValueOnce({ ...existingOrder, id: "o4", customerId: null })
      .mockResolvedValueOnce({ ...fullOrder, id: "o4" });
    mocks.fireNewTicket.mockRejectedValueOnce(unique);
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).resolves.toEqual(expect.objectContaining({ id: "o4" }));
  });

  it("rethrows non-unique creation/nested errors and handles missing concurrent full order", async () => {
    mocks.orderCreate.mockRejectedValueOnce(new Error("create failed"));
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("create failed");

    const unique = { code: "23505" };
    mocks.orderCreate.mockRejectedValue(unique);
    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o5" });
    mocks.orderFindById.mockResolvedValueOnce(null);
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).resolves.toEqual(expect.objectContaining({ id: "o1" }));

    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o6" });
    mocks.orderFindById.mockResolvedValueOnce(existingOrder);
    mocks.fireNewTicket.mockRejectedValueOnce(new Error("nested failed"));
    await expect(
      customerOrderService.createOrder("tok", { items: [{ menuItemId: "mi1", quantity: 1 }] }),
    ).rejects.toThrow("nested failed");
  });

  it("does not publish table update when occupation update returns null and tolerates inventory failure", async () => {
    mocks.tableUpdate.mockResolvedValue(null);
    mocks.deduct.mockRejectedValueOnce(new Error("inventory unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await customerOrderService.createOrder("tok", {
      items: [{ menuItemId: "mi1", quantity: 1 }],
    });

    expect(mocks.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "table.updated" }),
      expect.anything(),
      expect.anything(),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Inventory deduction failed for customer order",
      "o1",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("preserves concurrent customer identity and skips synthetic ticket items during deduction", async () => {
    const unique = { code: "23505" };
    mocks.orderCreate.mockRejectedValueOnce(unique);
    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o-customer" });
    mocks.loyaltyByPhone.mockResolvedValueOnce([{ id: "c1" }]);
    mocks.orderFindById
      .mockResolvedValueOnce({ ...existingOrder, id: "o-customer", customerId: "c1" })
      .mockResolvedValueOnce({
        ...fullOrder,
        id: "o-customer",
        kitchenTickets: [
          {
            ...ticket,
            items: [
              ...ticket.items,
              {
                id: "synthetic",
                menuItemId: null,
                variantId: null,
                quantity: 1,
                modifiers: [],
              },
            ],
          },
        ],
      });

    await customerOrderService.createOrder("tok", {
      items: [{ menuItemId: "mi1", quantity: 1 }],
      loyaltyPhone: "999",
    });

    expect(mocks.finalizeWhole).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "c1" }),
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({ customerId: "c1" }),
    );
    expect(mocks.fireNewTicket).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o-customer",
      expect.any(Array),
      expect.any(Number),
      0,
      undefined,
      undefined,
      expect.objectContaining({ customerId: "c1" }),
    );
    expect(mocks.deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o-customer",
      "kt1",
      [expect.objectContaining({ orderItemId: "oi1" })],
      null,
    );
  });

  it("handles orders with no fired kitchen ticket without inventory deduction", async () => {
    mocks.orderFindById.mockResolvedValue({ ...fullOrder, kitchenTickets: [] });
    await customerOrderService.createOrder("tok", {
      items: [{ menuItemId: "mi1", quantity: 1 }],
    });
    expect(mocks.deduct).not.toHaveBeenCalled();
  });
  it("handles a missing final order snapshot without kitchen ticket side effects", async () => {
    mocks.orderFindById.mockResolvedValueOnce(null);

    await expect(
      customerOrderService.createOrder("tok", {
        items: [{ menuItemId: "mi1", quantity: 1 }],
      }),
    ).resolves.toBeNull();

    expect(mocks.deduct).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "kitchen.ticket.created" }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("deducts inventory when a takeaway first-submit race appends to the concurrent order", async () => {
    const unique = { code: "23505" };
    mocks.getSession.mockResolvedValue({
      ...dineSession,
      tableId: null,
      mode: "TAKEAWAY",
    });
    mocks.orderCreate.mockRejectedValueOnce(unique);
    mocks.findOpenOrderBySession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "o-takeaway-race" });
    mocks.orderFindById
      .mockResolvedValueOnce({
        ...existingOrder,
        id: "o-takeaway-race",
        customerId: null,
      })
      .mockResolvedValueOnce({
        ...fullOrder,
        id: "o-takeaway-race",
      });

    await customerOrderService.createOrder("tok", {
      items: [{ menuItemId: "mi1", quantity: 1 }],
    });

    expect(mocks.initiateTakeawayPayment).not.toHaveBeenCalled();
    expect(mocks.deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o-takeaway-race",
      "kt1",
      expect.any(Array),
      null,
    );
  });

});
