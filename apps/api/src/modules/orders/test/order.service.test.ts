import { beforeEach, describe, expect, it, vi } from "vitest";
const {
  findById,
  findMany,
  create,
  updateStatus,
  fireNewTicket,
  refireItem,
  voidItem,
  compItem,
  mergeOrders,
} = vi.hoisted(() => ({
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  fireNewTicket: vi.fn(),
  refireItem: vi.fn(),
  voidItem: vi.fn(),
  compItem: vi.fn(),
  mergeOrders: vi.fn(),
}));
const { branchFind, tableFind, tableOpen, tableUpdate, transferOrderTable } =
  vi.hoisted(() => ({
    branchFind: vi.fn(),
    tableFind: vi.fn(),
    tableOpen: vi.fn(),
    tableUpdate: vi.fn(),
    transferOrderTable: vi.fn(),
  }));
const { tenantFind } = vi.hoisted(() => ({ tenantFind: vi.fn() }));
const { priceCombos } = vi.hoisted(() => ({
  priceCombos: vi.fn(),
}));
const { promotionFindCandidates, listRedemptionsForOrder, writeAudit } =
  vi.hoisted(() => ({
    promotionFindCandidates: vi.fn(),
    listRedemptionsForOrder: vi.fn(),
    writeAudit: vi.fn(),
  }));
const {
  availabilityFind,
  pricingOverrides,
  priceRuleCandidates,
  perCoverRule,
  effective,
  effectiveWithEvidence,
  allServed,
  findDetailedTicket,
  shouldHoldCourse,
  hasCourseNumber,
  inventoryImpact,
  deduct,
  publish,
  resolveStation,
  latestForItems,
  assertReasonUsable,
  activeMenuItemIds,
  assertApproved,
  customerGroupFind,
} = vi.hoisted(() => ({
  availabilityFind: vi.fn(),
  pricingOverrides: vi.fn(),
  priceRuleCandidates: vi.fn(),
  perCoverRule: vi.fn(),
  effective: vi.fn(),
  effectiveWithEvidence: vi.fn(),
  allServed: vi.fn(),
  findDetailedTicket: vi.fn(),
  shouldHoldCourse: vi.fn(),
  hasCourseNumber: vi.fn(),
  inventoryImpact: vi.fn(),
  deduct: vi.fn(),
  publish: vi.fn(),
  resolveStation: vi.fn(),
  latestForItems: vi.fn(),
  assertReasonUsable: vi.fn(),
  activeMenuItemIds: vi.fn(),
  assertApproved: vi.fn(),
  customerGroupFind: vi.fn(),
}));
vi.mock("../order.repository", () => ({
  orderRepository: {
    findById,
    findMany,
    create,
    updateStatus,
    fireNewTicket,
    refireItem,
    voidItem,
    compItem,
    mergeOrders,
  },
}));
vi.mock("../../branches/branch.repository", () => ({
  branchRepository: { findById: branchFind },
}));
vi.mock("../../tables/table.repository", () => ({
  tableRepository: {
    findById: tableFind,
    hasOpenOrders: tableOpen,
    update: tableUpdate,
    transferOrderTable,
  },
}));
vi.mock("../../menu/availability/availability.repository", () => ({
  availabilityRepository: {
    findByIds: availabilityFind,
    findPricingOverrides: pricingOverrides,
  },
}));
vi.mock("../../menu/availability/availability.service", () => ({
  availabilityService: {
    getEffectiveItem: effective,
    getEffectiveItemWithEvidence: effectiveWithEvidence,
  },
}));
vi.mock("../../menu/pricing/price-rule.repository", () => ({
  priceRuleRepository: {
    findCandidates: priceRuleCandidates,
    findPerCoverRule: perCoverRule,
  },
}));
vi.mock("../../kitchen-tickets/ticket.repository", () => ({
  ticketRepository: {
    allServed,
    findDetailedById: findDetailedTicket,
    shouldHoldCourse,
    hasCourseNumber,
  },
}));
vi.mock("../../inventory/inventory.service", () => ({
  inventoryService: {
    getOrderDeductions: inventoryImpact,
    deductForOrderItems: deduct,
    deductForOrderItemsWithRetry: deduct,
    syncMenuItemAvailability: vi.fn(),
  },
}));
vi.mock("../../../lib/event-bus", () => ({ eventBus: { publish } }));
vi.mock("../../kitchen-tickets/stations/station.service", () => ({
  stationResolver: { resolveForOrderItem: resolveStation },
}));
vi.mock("../../menu/change-log/menu-change-log", () => ({
  menuChangeLog: { latestForItems },
}));
vi.mock("../cancellation-reasons/cancellation-reason.service", () => ({
  cancellationReasonService: { assertUsable: assertReasonUsable },
}));
vi.mock("../../menu/menus/menu-resolver.service", () => ({
  menuResolver: { getActiveItemIds: activeMenuItemIds },
}));
vi.mock("../../tenants/tenant.repository", () => ({
  tenantRepository: { findById: tenantFind },
}));
vi.mock("../../menu/combos/combo-order.service", () => ({
  priceComboOrders: priceCombos,
}));
vi.mock("../../menu/promotions/promotion.repository", () => ({
  promotionRepository: {
    findCandidates: promotionFindCandidates,
    listRedemptionsForOrder,
  },
}));
vi.mock("../../customer-groups/customer-group.repository", () => ({
  customerGroupRepository: { findById: customerGroupFind },
}));
vi.mock("../../approvals/approval.service", () => ({
  approvalService: { assertApproved },
}));
vi.mock("../../../core/audit", () => ({ writeAudit }));
import { orderService } from "@/modules/orders/order.service";

const auth = (overrides: any = {}) => ({
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@example.com",
  roles: [],
  permissions: [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:update_status",
    "orders:cancel",
    "orders:void",
    "orders:comp",
  ],
  ...overrides,
});
const menu = {
  id: "m1",
  branchId: null,
  categoryId: "c1",
  name: "Pizza",
  isAvailable: true,
  basePrice: "10",
  taxRate: "5",
  variants: [],
  modifierGroupLinks: [],
};
const order = {
  id: "o1",
  branchId: "b1",
  tableId: null,
  status: "OPEN",
  source: "STAFF" as const,
  type: "DINE_IN" as const,
  billingMode: "LINE_ITEMS" as const,
  customerId: null,
  customerGroupId: null,
  subtotal: "0",
  discountAmount: "0",
  taxAmount: "0",
  serviceChargeAmount: "0",
  roundingAdjustment: "0",
  totalAmount: "0",
  items: [],
  kitchenTickets: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  tenantFind.mockResolvedValue({
    serviceChargePercent: null,
    serviceChargeTaxable: false,
    roundingPolicy: "NONE",
    defaultTaxMode: "EXCLUSIVE",
  });
  branchFind.mockResolvedValue({
    id: "b1",
    dineInEnabled: true,
    takeawayEnabled: true,
    deliveryEnabled: true,
    onlineEnabled: true,
  });
  availabilityFind.mockResolvedValue([menu]);
  pricingOverrides.mockResolvedValue([]);
  priceRuleCandidates.mockResolvedValue([]);
  perCoverRule.mockResolvedValue(undefined);
  effective.mockResolvedValue({ isHidden: false, effectiveStatus: "ACTIVE" });
  effectiveWithEvidence.mockResolvedValue({
    effective: {
      isHidden: false,
      effectiveStatus: "ACTIVE",
      availabilityReason: null,
      availabilityCause: "BASE_STATUS",
    },
    evidence: {
      item: {
        id: "m1",
        branchId: null,
        status: "ACTIVE",
        basePrice: "10",
        taxRate: "5",
        prepTimeMinutes: null,
        availabilityReason: null,
        manualOverrideStatus: null,
        manualOverrideReason: null,
        manualStockCount: null,
      },
      resolvedStatus: { status: "ACTIVE", reason: null },
      branchOverride: null,
      channelOverride: null,
    },
  });
  assertApproved.mockResolvedValue(undefined);
  customerGroupFind.mockResolvedValue({ id: "group-1" });
  resolveStation.mockResolvedValue("station-1");
  latestForItems.mockResolvedValue(new Map([["m1", "event-1"]]));
  activeMenuItemIds.mockResolvedValue(new Set(["m1"]));
  priceCombos.mockResolvedValue({ lines: [], subtotal: 0, taxAmount: 0 });
  promotionFindCandidates.mockResolvedValue([]);
  listRedemptionsForOrder.mockResolvedValue([]);
  writeAudit.mockResolvedValue(undefined);
  shouldHoldCourse.mockResolvedValue(false);
  hasCourseNumber.mockResolvedValue(true);
});

describe("order service", () => {
  it("enforces list/get authorization and resource scope", async () => {
    findMany.mockResolvedValue({
      items: [{ id: "o1" }],
      total: 1,
      page: 1,
      limit: 25,
    });
    await expect(
      orderService.list(auth(), { status: "OPEN" }),
    ).resolves.toEqual({
      items: [{ id: "o1" }],
      total: 1,
      page: 1,
      limit: 25,
    });
    findById.mockResolvedValue(undefined);
    await expect(orderService.getById(auth(), "o1")).rejects.toThrow(
      "Order with id o1 not found",
    );
    findById.mockResolvedValue(order);
    await expect(
      orderService.getById(auth({ branchId: "b2" }), "o1"),
    ).rejects.toThrow("Order branch access denied");
  });
  it("validates branch/type/table before creating an order", async () => {
    await expect(
      orderService.create(auth({ branchId: null }), {
        type: "TAKEAWAY",
        items: [],
      }),
    ).rejects.toThrow("specific branch");
    branchFind.mockResolvedValue({ id: "b1", takeawayEnabled: false });
    await expect(
      orderService.create(auth(), { type: "TAKEAWAY", items: [] }),
    ).rejects.toThrow("not enabled");
    branchFind.mockResolvedValue({ id: "b1", dineInEnabled: true });
    await expect(
      orderService.create(auth(), { type: "DINE_IN", items: [] }),
    ).rejects.toThrow("table");
    tableFind.mockResolvedValue({ id: "t1", branchId: "b2" });
    await expect(
      orderService.create(auth(), {
        type: "DINE_IN",
        tableId: "t1",
        items: [],
      }),
    ).rejects.toThrow("Table not found");
  });
  it("keeps normal orders out of course mode and requires tenant opt-in for explicit courses", async () => {
    create.mockResolvedValue({ id: "o1" });
    findById.mockResolvedValue({
      ...order,
      id: "o1",
      kitchenTickets: [
        {
          id: "kt1",
          branchId: "b1",
          status: "FIRED",
          items: [
            {
              id: "i1",
              menuItemId: "m1",
              variantId: null,
              quantity: 1,
              weightQuantity: null,
              weightUnit: null,
              modifiers: [],
            },
          ],
        },
      ],
    });
    await orderService.create(auth(), {
      type: "TAKEAWAY",
      items: [{ menuItemId: "m1", quantity: 1 }],
    });
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [
          expect.not.objectContaining({ courseNumber: expect.anything() }),
        ],
      }),
    );

    await expect(
      orderService.create(auth(), {
        type: "TAKEAWAY",
        items: [{ menuItemId: "m1", quantity: 1, courseNumber: 1 }],
      }),
    ).rejects.toThrow("Course sequencing is not enabled");

    tenantFind.mockResolvedValue({
      serviceChargePercent: null,
      serviceChargeTaxable: false,
      roundingPolicy: "NONE",
      defaultTaxMode: "EXCLUSIVE",
      courseSequencingEnabled: true,
    });
    await orderService.create(auth(), {
      type: "TAKEAWAY",
      items: [{ menuItemId: "m1", quantity: 1, courseNumber: 1 }],
    });
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ courseNumber: 1 })],
      }),
    );
  });

  it("rejects partially coursed orders instead of silently defaulting unassigned lines", async () => {
    tenantFind.mockResolvedValue({
      serviceChargePercent: null,
      serviceChargeTaxable: false,
      roundingPolicy: "NONE",
      defaultTaxMode: "EXCLUSIVE",
      courseSequencingEnabled: true,
    });
    await expect(
      orderService.create(auth(), {
        type: "TAKEAWAY",
        items: [
          { menuItemId: "m1", quantity: 1, courseNumber: 1 },
          { menuItemId: "m1", quantity: 1 },
        ],
      }),
    ).rejects.toThrow("Every line must have a course");
  });

  it("creates an order, publishes events, and treats inventory deduction as best-effort", async () => {
    create.mockResolvedValue({ id: "o1" });
    findById.mockResolvedValue({
      ...order,
      id: "o1",
      kitchenTickets: [
        {
          id: "kt1",
          branchId: "b1",
          status: "FIRED",
          items: [
            {
              id: "i1",
              menuItemId: "m1",
              variantId: null,
              quantity: 1,
              weightQuantity: null,
              weightUnit: null,
              modifiers: [],
            },
          ],
        },
      ],
    });
    deduct.mockRejectedValue(new Error("inventory unavailable"));
    await expect(
      orderService.create(auth(), {
        type: "TAKEAWAY",
        items: [{ menuItemId: "m1", quantity: 1 }],
      }),
    ).resolves.toMatchObject({ id: "o1" });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order.created" }),
      "t1",
      "b1",
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "kitchen.ticket.created" }),
      "t1",
      "b1",
    );
    expect(deduct).toHaveBeenCalled();
    expect(effective).toHaveBeenCalledWith("t1", "m1", "b1", {
      channel: "STAFF",
      fulfillmentType: "TAKEAWAY",
      asOf: expect.any(Date),
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            unitPrice: 10,
            subtotal: 10,
            pricingAttribution: expect.objectContaining({
              BASE_PRICE: 10,
              VARIANT: 0,
              MODIFIER: 0,
            }),
            stationId: "station-1",
            menuChangeEventId: "event-1",
          }),
        ],
        subtotal: 10,
        taxAmount: 0.5,
        totalAmount: 10.5,
      }),
    );
    expect(resolveStation).toHaveBeenCalledWith("t1", "m1", []);
    expect(latestForItems).toHaveBeenCalledWith("t1", ["m1"], expect.any(Date));
  });
  it("persists combo parent + children and deducts inventory only for real components", async () => {
    const groupId = "99999999-9999-4999-8999-999999999999";
    priceCombos.mockResolvedValue({
      lines: [
        {
          menuItemId: null,
          menuItemName: "Lunch Combo",
          quantity: 1,
          unitPrice: 8,
          subtotal: 0,
          taxRate: 0,
          fulfillmentType: "TAKEAWAY",
          modifiers: [],
          pricingAttribution: {
            BASE_PRICE: 0,
            VARIANT: 0,
            MODIFIER: 0,
            COMBO: 8,
          },
          comboId: "combo-1",
          comboGroupId: groupId,
        },
        {
          menuItemId: "m1",
          menuItemName: "Pizza",
          quantity: 1,
          unitPrice: 8,
          subtotal: 8,
          taxRate: 5,
          fulfillmentType: "TAKEAWAY",
          modifiers: [],
          pricingAttribution: {
            BASE_PRICE: 10,
            VARIANT: 0,
            MODIFIER: 0,
            COMBO: -2,
          },
          comboId: "combo-1",
          comboGroupId: groupId,
        },
      ],
      subtotal: 8,
      taxAmount: 0.4,
    });
    create.mockResolvedValue({ id: "o1" });
    findById.mockResolvedValue({
      ...order,
      id: "o1",
      kitchenTickets: [
        {
          id: "kt1",
          branchId: "b1",
          status: "FIRED",
          items: [
            {
              id: "i1",
              menuItemId: "m1",
              variantId: null,
              quantity: 1,
              weightQuantity: null,
              weightUnit: null,
              modifiers: [],
            },
          ],
        },
      ],
    });

    await orderService.create(auth(), {
      type: "TAKEAWAY",
      items: [],
      combos: [
        {
          comboId: "combo-1",
          selections: [{ slotId: "slot-1", optionIds: ["option-1"] }],
        },
      ],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 8,
        taxAmount: 0.4,
        items: [
          expect.objectContaining({
            menuItemId: null,
            comboId: "combo-1",
            comboGroupId: groupId,
            stationId: null,
            menuChangeEventId: null,
          }),
          expect.objectContaining({
            menuItemId: "m1",
            comboId: "combo-1",
            comboGroupId: groupId,
            stationId: "station-1",
            menuChangeEventId: "event-1",
          }),
        ],
      }),
    );
    expect(latestForItems).toHaveBeenCalledWith("t1", ["m1"], expect.any(Date));
    expect(resolveStation).toHaveBeenCalledTimes(1);
    expect(deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt1",
      [expect.objectContaining({ menuItemId: "m1", quantity: 1 })],
      "u1",
    );
  });

  it("rejects an available item that is not on an active menu", async () => {
    activeMenuItemIds.mockResolvedValue(new Set());
    await expect(
      orderService.create(auth(), {
        type: "TAKEAWAY",
        items: [{ menuItemId: "m1", quantity: 1 }],
      }),
    ).rejects.toThrow("isn't on an active menu");
    expect(create).not.toHaveBeenCalled();
  });
  it("requires served tickets before billing and maps status changes", async () => {
    findById.mockResolvedValue(order);
    allServed.mockResolvedValue(false);
    await expect(
      orderService.updateStatus(auth(), "o1", "BILL_REQUESTED"),
    ).rejects.toThrow("All kitchen tickets must be served");
    allServed.mockResolvedValue(true);
    updateStatus.mockResolvedValue({ ...order, status: "BILL_REQUESTED" });
    findById
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, status: "BILL_REQUESTED" });
    await expect(
      orderService.updateStatus(auth(), "o1", "BILL_REQUESTED"),
    ).resolves.toMatchObject({ status: "BILL_REQUESTED" });
  });
  it("only fires additional tickets from OPEN orders", async () => {
    findById.mockResolvedValue({ ...order, status: "PAID" });
    await expect(
      orderService.fireTicket(auth(), "o1", { items: [] }),
    ).rejects.toThrow("Cannot fire a new ticket while the tab is PAID");
    findById.mockResolvedValue({ ...order, status: "OPEN" });
    fireNewTicket.mockResolvedValue({ id: "t2" });
    await expect(
      orderService.fireTicket(auth(), "o1", {
        items: [{ menuItemId: "m1", quantity: 1 }],
      }),
    ).resolves.toMatchObject({ id: "o1" });
    expect(fireNewTicket).toHaveBeenCalled();
    expect(effective).toHaveBeenLastCalledWith("t1", "m1", "b1", {
      channel: "STAFF",
      fulfillmentType: "DINE_IN",
      asOf: expect.any(Date),
    });
  });
  it("refires a combo component from its stored allocation, refreshes routing, and performs a fresh inventory deduction", async () => {
    const original = {
      id: "combo-child",
      menuItemId: "m1",
      menuItemName: "Pizza",
      variantId: null,
      variantName: null,
      quantity: 1,
      unitPrice: "8.00",
      subtotal: "8.00",
      taxRate: "5",
      taxMode: "EXCLUSIVE" as const,
      fulfillmentType: "DINE_IN" as const,
      itemStatus: "ACTIVE",
      comboId: "combo-1",
      comboGroupId: "group-1",
      stationId: "old-station",
      menuChangeEventId: "old-event",
      pricingAttribution: {
        BASE_PRICE: 10,
        VARIANT: 0,
        MODIFIER: 0,
        COMBO: -2,
      },
      modifiers: [],
      compedAt: null,
    };
    const fullBefore = {
      ...order,
      items: [original],
      customerId: null,
      kitchenTickets: [
        {
          id: "kt-original",
          status: "PREPARING",
          items: [{ id: original.id }],
        },
      ],
    };
    const fullAfter = {
      ...order,
      items: [
        { ...original, itemStatus: "REFIRED", compedAt: new Date() },
        {
          ...original,
          id: "replacement",
          itemStatus: "ACTIVE",
          stationId: "station-1",
          menuChangeEventId: "event-1",
          refiresOrderItemId: original.id,
        },
      ],
    };
    findById.mockResolvedValueOnce(fullBefore).mockResolvedValueOnce(fullAfter);
    refireItem.mockResolvedValue({
      ticket: { id: "kt-refire" },
      replacement: { id: "replacement" },
    });
    findDetailedTicket
      .mockResolvedValueOnce({
        id: "kt-refire",
        orderId: "o1",
        branchId: "b1",
        status: "FIRED",
        items: [
          {
            id: "replacement",
            menuItemId: "m1",
            variantId: null,
            quantity: 1,
            modifiers: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "kt-original",
        orderId: "o1",
        branchId: "b1",
        status: "PREPARING",
        items: [{ ...original, itemStatus: "REFIRED" }],
      });
    deduct.mockResolvedValue({ short: [] });

    await expect(
      orderService.refireItem(auth(), "o1", original.id, "burnt", true),
    ).resolves.toEqual(fullAfter);

    expect(refireItem).toHaveBeenCalledWith(
      expect.objectContaining({
        originalItemId: original.id,
        compOriginal: true,
        item: expect.objectContaining({
          menuItemId: "m1",
          comboId: "combo-1",
          comboGroupId: "group-1",
          unitPrice: 8,
          subtotal: 8,
          stationId: "station-1",
          menuChangeEventId: "event-1",
        }),
      }),
    );
    expect(resolveStation).toHaveBeenCalledWith("t1", "m1", []);
    expect(deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt-refire",
      [
        expect.objectContaining({
          orderItemId: "replacement",
          menuItemId: "m1",
          quantity: 1,
        }),
      ],
      "u1",
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORDER_ITEM_REFIRED" }),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "kitchen.ticket.updated",
        payload: expect.objectContaining({ id: "kt-original" }),
      }),
      "t1",
      "b1",
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "kitchen.ticket.created",
        payload: expect.objectContaining({ id: "kt-refire" }),
      }),
      "t1",
      "b1",
    );
  });

  it.each(["HELD", "PENDING_PAYMENT"])(
    "rejects refire when the original ticket is %s and was never sent to kitchen",
    async (status) => {
      const original = {
        id: "i-held",
        menuItemId: "m1",
        menuItemName: "Pizza",
        variantId: null,
        variantName: null,
        quantity: 1,
        unitPrice: "10.00",
        subtotal: "10.00",
        taxRate: "5",
        taxMode: "EXCLUSIVE",
        fulfillmentType: "DINE_IN",
        itemStatus: "ACTIVE",
        pricingAttribution: null,
        modifiers: [],
        compedAt: null,
      };
      findById.mockResolvedValue({
        ...order,
        items: [original],
        customerId: null,
        kitchenTickets: [
          { id: "kt-held", status, items: [{ id: original.id }] },
        ],
      });
      await expect(
        orderService.refireItem(auth(), "o1", original.id, "redo", false),
      ).rejects.toThrow("after it has actually been sent to the kitchen");
      expect(refireItem).not.toHaveBeenCalled();
    },
  );

  it("rejects orphan later courses whose immediate predecessor does not exist", async () => {
    findById.mockResolvedValue({
      ...order,
      items: [],
      customerId: null,
      kitchenTickets: [],
    });
    tenantFind.mockResolvedValue({
      serviceChargePercent: null,
      serviceChargeTaxable: false,
      roundingPolicy: "NONE",
      defaultTaxMode: "EXCLUSIVE",
      courseSequencingEnabled: true,
    });
    hasCourseNumber.mockResolvedValue(false);
    await expect(
      orderService.fireTicket(auth(), "o1", {
        items: [{ menuItemId: "m1", quantity: 1, courseNumber: 2 }],
      }),
    ).rejects.toThrow("Course 1 must exist before Course 2 can be added");
    expect(fireNewTicket).not.toHaveBeenCalled();
  });

  it("voids an unserved active line and recomputes totals", async () => {
    const detailed = {
      ...order,
      discountAmount: "0",
      items: [
        { id: "i1", itemStatus: "ACTIVE", subtotal: "10", taxRate: "5" },
        { id: "i2", itemStatus: "ACTIVE", subtotal: "20", taxRate: "10" },
      ],
      kitchenTickets: [
        { id: "kt1", status: "FIRED", items: [{ id: "i1" }, { id: "i2" }] },
      ],
    };
    findById.mockResolvedValueOnce(detailed).mockResolvedValueOnce({
      ...detailed,
      subtotal: "20",
      taxAmount: "2",
      totalAmount: "22",
    });
    voidItem.mockResolvedValue({
      voided: { id: "i1", itemStatus: "VOIDED" },
      reversedInventoryItemIds: ["inv1"],
    });

    await expect(
      orderService.voidItem(auth(), "o1", "i1", "mistake"),
    ).resolves.toMatchObject({ totalAmount: "22" });
    expect(voidItem).toHaveBeenCalledWith(
      "t1",
      "o1",
      "i1",
      "u1",
      "mistake",
      undefined,
      expect.objectContaining({
        subtotal: 20,
        discountAmount: 0,
        taxAmount: 2,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 22,
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order.item.voided" }),
      "t1",
      "b1",
    );
  });

  it("voiding any combo member removes the entire combo group from totals", async () => {
    const groupId = "combo-group-1";
    const detailed = {
      ...order,
      discountAmount: "0",
      items: [
        {
          id: "parent",
          comboGroupId: groupId,
          itemStatus: "ACTIVE",
          subtotal: "0",
          taxRate: "0",
        },
        {
          id: "child",
          comboGroupId: groupId,
          itemStatus: "ACTIVE",
          subtotal: "8",
          taxRate: "5",
        },
        {
          id: "regular",
          comboGroupId: null,
          itemStatus: "ACTIVE",
          subtotal: "20",
          taxRate: "10",
        },
      ],
      kitchenTickets: [
        {
          id: "kt1",
          status: "FIRED",
          items: [{ id: "parent" }, { id: "child" }, { id: "regular" }],
        },
      ],
    };
    findById.mockResolvedValueOnce(detailed).mockResolvedValueOnce({
      ...detailed,
      subtotal: "20",
      taxAmount: "2",
      totalAmount: "22",
    });
    voidItem.mockResolvedValue({
      voided: { id: "parent", itemStatus: "VOIDED" },
      voidedItemIds: ["parent", "child"],
      reversedInventoryItemIds: ["inv1"],
    });

    await orderService.voidItem(auth(), "o1", "parent", "cancel combo");

    expect(voidItem).toHaveBeenCalledWith(
      "t1",
      "o1",
      "parent",
      "u1",
      "cancel combo",
      undefined,
      expect.objectContaining({
        subtotal: 20,
        discountAmount: 0,
        taxAmount: 2,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 22,
      }),
    );
  });

  it("rejects voids without permission and after the ticket is served", async () => {
    await expect(
      orderService.voidItem(auth({ permissions: [] }), "o1", "i1", "mistake"),
    ).rejects.toThrow("Insufficient permissions");
    findById.mockResolvedValue({
      ...order,
      items: [{ id: "i1", itemStatus: "ACTIVE", subtotal: "10", taxRate: "5" }],
      kitchenTickets: [{ id: "kt1", status: "SERVED", items: [{ id: "i1" }] }],
    });
    await expect(
      orderService.voidItem(auth(), "o1", "i1", "mistake"),
    ).rejects.toThrow("served item");
  });

  it("comps a served line without reversing its inventory deduction", async () => {
    const detailed = {
      ...order,
      discountAmount: "0",
      items: [
        { id: "i1", itemStatus: "ACTIVE", subtotal: "10", taxRate: "5" },
        { id: "i2", itemStatus: "ACTIVE", subtotal: "20", taxRate: "10" },
      ],
      kitchenTickets: [{ id: "kt1", status: "SERVED", items: [{ id: "i1" }] }],
    };
    findById.mockResolvedValueOnce(detailed).mockResolvedValueOnce({
      ...detailed,
      subtotal: "20",
      taxAmount: "2",
      totalAmount: "22",
    });
    compItem.mockResolvedValue({ id: "i1", itemStatus: "COMPED" });

    await expect(
      orderService.compItem(auth(), "o1", "i1", "service recovery"),
    ).resolves.toMatchObject({ totalAmount: "22" });
    expect(compItem).toHaveBeenCalledWith(
      "t1",
      "o1",
      "i1",
      "u1",
      "service recovery",
      undefined,
      expect.objectContaining({
        subtotal: 20,
        discountAmount: 0,
        taxAmount: 2,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 22,
      }),
    );
    expect(deduct).not.toHaveBeenCalled();
  });

  it("requires the distinct comp permission", async () => {
    await expect(
      orderService.compItem(
        auth({ permissions: ["orders:void"] }),
        "o1",
        "i1",
        "reason",
      ),
    ).rejects.toThrow("Insufficient permissions");
  });

  it("cancels with structured, free-text, or combined reasons", async () => {
    for (const [reason, reasonId] of [
      [undefined, "00000000-0000-4000-8000-000000000001"],
      ["Other explanation", undefined],
      ["Extra detail", "00000000-0000-4000-8000-000000000001"],
    ] as const) {
      findById
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: "CANCELLED" });
      updateStatus.mockResolvedValue({ ...order, status: "CANCELLED" });
      await expect(
        orderService.updateStatus(auth(), "o1", "CANCELLED", reason, reasonId),
      ).resolves.toMatchObject({ status: "CANCELLED" });
      expect(updateStatus).toHaveBeenLastCalledWith(
        "t1",
        "o1",
        "CANCELLED",
        "u1",
        reason,
        reasonId,
        "b1",
      );
    }
    expect(assertReasonUsable).toHaveBeenCalledWith(
      "t1",
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("atomically transfers an open dine-in order and publishes floor and kitchen updates", async () => {
    const detailed = {
      ...order,
      tableId: "old",
      customerSessionId: "session-1",
      kitchenTickets: [{ id: "kt1", status: "FIRED" }],
    };
    findById.mockResolvedValueOnce(detailed).mockResolvedValueOnce({
      ...detailed,
      tableId: "new",
      table: { id: "new", name: "Table 2" },
    });
    tableFind.mockImplementation((_tenant: string, id: string) =>
      Promise.resolve(
        id === "old"
          ? {
              id,
              branchId: "b1",
              name: "Table 1",
              status: "OCCUPIED",
              isActive: true,
            }
          : {
              id,
              branchId: "b1",
              name: "Table 2",
              status: "AVAILABLE",
              isActive: true,
            },
      ),
    );
    transferOrderTable.mockResolvedValue({
      order: { id: "o1", tableId: "new" },
      oldTable: { id: "old", status: "AVAILABLE" },
      newTable: { id: "new", status: "OCCUPIED" },
    });
    findDetailedTicket.mockResolvedValue({
      id: "kt1",
      status: "FIRED",
      order: { table: { name: "Table 2" } },
    });

    await expect(
      orderService.transferTable(auth(), "o1", "new", "Guest request"),
    ).resolves.toMatchObject({ tableId: "new" });
    expect(transferOrderTable).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "o1",
        oldTableId: "old",
        newTableId: "new",
        customerSessionId: "session-1",
        reason: "Guest request",
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "kitchen.ticket.updated" }),
      "t1",
      "b1",
    );
  });

  it("rejects unavailable and concurrently claimed transfer destinations", async () => {
    findById.mockResolvedValue({ ...order, tableId: "old" });
    tableFind.mockImplementation((_tenant: string, id: string) =>
      Promise.resolve(
        id === "old"
          ? {
              id,
              branchId: "b1",
              name: "Table 1",
              status: "OCCUPIED",
              isActive: true,
            }
          : {
              id,
              branchId: "b1",
              name: "Table 2",
              status: "OCCUPIED",
              isActive: true,
            },
      ),
    );
    await expect(
      orderService.transferTable(auth(), "o1", "new"),
    ).rejects.toThrow("destination table is not available");
    tableFind.mockImplementation((_tenant: string, id: string) =>
      Promise.resolve({
        id,
        branchId: "b1",
        name: id,
        status: id === "new" ? "AVAILABLE" : "OCCUPIED",
        isActive: true,
      }),
    );
    transferOrderTable.mockResolvedValue(undefined);
    await expect(
      orderService.transferTable(auth(), "o1", "new"),
    ).rejects.toThrow("claimed by another order");
  });

  it("rejects closed or already-merged table merges with a clear domain error", async () => {
    mergeOrders.mockResolvedValueOnce({ status: "closed" });
    await expect(
      orderService.mergeOrders(auth(), "source", "target"),
    ).rejects.toThrow("cannot be merged");
    mergeOrders.mockResolvedValueOnce({ status: "already_merged" });
    await expect(
      orderService.mergeOrders(auth(), "source", "target"),
    ).rejects.toThrow("merge chain");
  });

  it("merges billing without changing kitchen tickets", async () => {
    mergeOrders.mockResolvedValue({
      status: "ok",
      source: { id: "source" },
      target: { id: "target" },
    });
    findById.mockImplementation((_tenant: string, id: string) =>
      Promise.resolve({
        ...order,
        id,
        kitchenTickets: [{ id: `${id}-ticket`, status: "FIRED" }],
      }),
    );
    const beforeTicketCalls = findDetailedTicket.mock.calls.length;
    await expect(
      orderService.mergeOrders(auth(), "source", "target"),
    ).resolves.toMatchObject({
      source: { id: "source" },
      target: { id: "target" },
    });
    expect(findDetailedTicket).toHaveBeenCalledTimes(beforeTicketCalls);
  });
});

describe("advanced order lifecycle acceptance", () => {
  it("G9 creates PER_COVER orders from the cover rate and applies normal tax/service-charge/rounding stages", async () => {
    tenantFind.mockResolvedValue({
      serviceChargePercent: "10",
      serviceChargeTaxable: false,
      roundingPolicy: "NEAREST_5",
      defaultTaxMode: "EXCLUSIVE",
    });
    perCoverRule.mockResolvedValue({
      id: "cover-adult",
      tenantId: "t1",
      organizationId: null,
      menuItemId: null,
      menuItemSku: null,
      variantId: null,
      branchId: null,
      channel: null,
      fulfillmentType: null,
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      customerGroupId: null,
      coverTier: null,
      priority: 0,
      price: "23",
      percentOff: null,
      taxRate: "10",
      isPerCover: true,
      isActive: true,
    });
    create.mockResolvedValue({ id: "buffet-1" });
    findById.mockResolvedValue({
      id: "buffet-1",
      branchId: "b1",
      status: "OPEN",
      billingMode: "PER_COVER",
      totalAmount: "82.50",
    });

    await orderService.create(auth(), {
      type: "TAKEAWAY",
      billingMode: "PER_COVER",
      coverCount: 3,
      perCoverPriceRuleId: "cover-adult",
      items: [{ menuItemId: "m1", quantity: 4 }],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        billingMode: "PER_COVER",
        coverCount: 3,
        perCoverPriceRuleId: "cover-adult",
        perCoverRate: 23,
        subtotal: 69,
        taxAmount: 6.9,
        serviceChargeAmount: 6.9,
        roundingAdjustment: 2.2,
        totalAmount: 85,
        items: [expect.objectContaining({ billingExcluded: true })],
      }),
    );
  });

  it("G9 rejects caller-controlled cover fields on ordinary LINE_ITEMS orders", async () => {
    await expect(
      orderService.create(auth(), {
        type: "TAKEAWAY",
        billingMode: "LINE_ITEMS",
        coverCount: 2,
        perCoverPriceRuleId: "cover-adult",
        items: [{ menuItemId: "m1", quantity: 1 }],
      }),
    ).rejects.toThrow("only valid for PER_COVER");
    expect(create).not.toHaveBeenCalled();
  });

  it("G6 produces a zero-priced REFILL sibling, preserves order totals, and deducts inventory again", async () => {
    const original = {
      id: "rice-1",
      menuItemId: "m1",
      menuItemName: "Rice",
      variantId: null,
      variantName: null,
      quantity: 1,
      unitPrice: "5.00",
      subtotal: "5.00",
      taxRate: "5",
      taxMode: "EXCLUSIVE" as const,
      fulfillmentType: "DINE_IN" as const,
      itemStatus: "ACTIVE",
      comboId: "thali",
      comboGroupId: "group-1",
      comboSlotOptionId: "slot-option-rice",
      comboSlotOption: { id: "slot-option-rice", isUnlimitedRefill: true },
      stationId: "station-1",
      menuChangeEventId: "event-1",
      pricingAttribution: { BASE_PRICE: 5, VARIANT: 0, MODIFIER: 0, COMBO: 0 },
      modifiers: [],
      compedAt: null,
    };
    const before = {
      ...order,
      subtotal: "20.00",
      discountAmount: "0",
      taxAmount: "1.00",
      serviceChargeAmount: "0",
      roundingAdjustment: "0",
      totalAmount: "21.00",
      items: [original],
      kitchenTickets: [
        {
          id: "kt-original",
          status: "PREPARING",
          items: [{ id: original.id }],
        },
      ],
    };
    const after = {
      ...before,
      items: [
        ...before.items,
        {
          ...original,
          id: "rice-refill",
          unitPrice: "0.00",
          subtotal: "0.00",
          refireType: "REFILL",
        },
      ],
    };
    findById.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    refireItem.mockResolvedValue({
      ticket: { id: "kt-refill" },
      replacement: { id: "rice-refill" },
    });
    findDetailedTicket.mockResolvedValue({
      id: "kt-refill",
      orderId: "o1",
      branchId: "b1",
      status: "FIRED",
      items: [
        {
          id: "rice-refill",
          menuItemId: "m1",
          variantId: null,
          quantity: 1,
          weightQuantity: null,
          weightUnit: null,
          modifiers: [],
        },
      ],
    });

    await orderService.refillItem(auth(), "o1", original.id);

    expect(refireItem).toHaveBeenCalledWith(
      expect.objectContaining({
        originalItemId: original.id,
        claimOriginal: false,
        refireType: "REFILL",
        forceBillingExcluded: true,
        item: expect.objectContaining({
          unitPrice: 0,
          subtotal: 0,
          billingExcluded: true,
          comboSlotOptionId: "slot-option-rice",
        }),
        absoluteTotals: expect.objectContaining({
          subtotal: 20,
          taxAmount: 1,
          totalAmount: 21,
        }),
      }),
    );
    expect(deduct).toHaveBeenCalledWith(
      "t1",
      "b1",
      "o1",
      "kt-refill",
      [
        expect.objectContaining({
          orderItemId: "rice-refill",
          menuItemId: "m1",
          quantity: 1,
        }),
      ],
      "u1",
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORDER_ITEM_REFILL" }),
    );
  });
});
