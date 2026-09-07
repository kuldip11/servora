import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, list, getEffectiveItem, price, getOrderDeductions } =
  vi.hoisted(() => ({
    findById: vi.fn(),
    list: vi.fn(),
    getEffectiveItem: vi.fn(),
    price: vi.fn(),
    getOrderDeductions: vi.fn(),
  }));
vi.mock("../../../orders/order.repository", () => ({
  orderRepository: { findById },
}));
vi.mock("../../change-log/menu-change-log", () => ({
  menuChangeLog: { list },
}));
vi.mock("../../availability/availability.service", () => ({
  availabilityService: { getEffectiveItem },
}));
vi.mock("../../../orders/pricing/pricing-pipeline", () => ({
  pricingPipeline: { price },
}));
vi.mock("../../../../core/auth", () => ({ requirePermission: vi.fn() }));
vi.mock("../../../inventory/inventory.service", () => ({
  inventoryService: { getOrderDeductions },
}));

import { InternalError } from "@/core/errors";
import { orderExplainService } from "@/modules/menu/explain/order-explain.service";

const auth = {
  tenantId: "tenant",
  branchId: "branch",
  userId: "user",
  roles: [],
  permissions: [],
} as never;

const line = (
  id: string,
  cause: string,
  source: "PRICE_RULE" | "BRANCH_OVERRIDE" | "MENU_ITEM",
) => {
  const menuItemId = `menu-${id}`;
  return {
    id,
    menuItemId,
    menuItemName: `Item ${id}`,
    quantity: 1,
    unitPrice: "10.00",
    subtotal: "10.00",
    taxRate: "5.00",
    resolutionAsOf: new Date("2026-08-30T10:00:00.000Z"),
    availabilitySnapshot: {
      asOf: "2026-08-30T10:00:00.000Z",
      branchId: "branch",
      channel: "STAFF",
      fulfillmentType: "DINE_IN",
      effectiveStatus: cause === "SCHEDULE" ? "OUT_OF_STOCK" : "ACTIVE",
      isHidden: false,
      reason: `${cause} reason at fire time`,
      cause,
    },
    availabilityReplayEvidence: {
      item: {
        id: menuItemId,
        branchId: null,
        status: "ACTIVE",
        basePrice: "10.00",
        taxRate: "5.00",
        prepTimeMinutes: null,
        availabilityReason: null,
        manualOverrideStatus: null,
        manualOverrideReason: null,
        manualStockCount: null,
      },
      resolvedStatus: {
        status: cause === "SCHEDULE" ? "OUT_OF_STOCK" : "ACTIVE",
        reason: `${cause} reason at fire time`,
      },
      branchOverride: null,
      channelOverride: null,
    },
    pricingReplayEvidence: {
      requestedLine: { menuItemId, quantity: 1 },
      item: {
        id: menuItemId,
        branchId: null,
        name: `Item ${id}`,
        categoryId: "category",
        isAvailable: true,
        basePrice: "10.00",
        taxRate: "5.00",
        variants: [],
        modifierGroupLinks: [],
      },
      branchOverride: null,
      priceRules: [],
    },
    pricingAttribution: {
      BASE_PRICE: 10,
      VARIANT: 0,
      MODIFIER: 0,
      PRICE_SOURCE: {
        kind: source,
        id: `source-${id}`,
        description: `${source} won`,
      },
    },
  };
};

describe("H1 point-in-time order explanation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    getOrderDeductions.mockResolvedValue([]);
    const items = [
      line("schedule", "SCHEDULE", "MENU_ITEM"),
      line("override", "BRANCH_OVERRIDE", "BRANCH_OVERRIDE"),
      line("rule", "BASE_STATUS", "PRICE_RULE"),
    ];
    findById.mockResolvedValue({
      id: "order",
      branchId: "branch",
      status: "OPEN",
      kitchenTickets: [],
      customerId: null,
      customerGroupId: null,
      resolutionAsOf: new Date("2026-08-30T10:00:00.000Z"),
      createdAt: new Date("2026-08-30T10:00:01.000Z"),
      subtotal: "30.00",
      discountAmount: "0.00",
      taxAmount: "1.50",
      serviceChargeAmount: "0.00",
      roundingAdjustment: "0.00",
      totalAmount: "31.50",
      items,
    });
    getEffectiveItem.mockImplementation(async (_tenantId, itemId) => {
      const item = items.find((candidate) => candidate.menuItemId === itemId)!;
      return {
        effectiveStatus: item.availabilitySnapshot.effectiveStatus,
        isHidden: false,
        availabilityReason: item.availabilitySnapshot.reason,
        availabilityCause: item.availabilitySnapshot.cause,
      };
    });
    price.mockResolvedValue({
      lines: [{ unitPrice: 10, subtotal: 10, taxRate: 5 }],
      subtotal: 10,
      taxAmount: 0.5,
    });
  });

  it("re-invokes the authoritative resolvers with immutable fire-time evidence", async () => {
    const explained = await orderExplainService.explainOrder(auth, "order");
    expect(explained.asOf).toBe("2026-08-30T10:00:00.000Z");
    expect(explained.completeHistory).toBe(true);
    expect(getEffectiveItem).toHaveBeenCalledTimes(3);
    expect(price).toHaveBeenCalledTimes(3);
    expect(getEffectiveItem.mock.calls[0]?.[3]).toMatchObject({
      asOf: new Date("2026-08-30T10:00:00.000Z"),
      historicalReplay: expect.any(Object),
    });
    expect(price.mock.calls[0]?.[0]).toMatchObject({
      asOf: new Date("2026-08-30T10:00:00.000Z"),
      historicalReplay: expect.any(Object),
    });
    expect(explained.lines[0]!.availabilityAtOrder).toMatchObject({
      cause: "SCHEDULE",
    });
    expect(explained.lines[2]!.pricingReplay.priceSource).toMatchObject({
      kind: "PRICE_RULE",
    });
    expect(
      explained.lines.every(
        (entry) => entry.authoritativePricingReplay?.matchesSnapshot,
      ),
    ).toBe(true);
    expect(
      explained.lines.every(
        (entry) => entry.authoritativeAvailabilityReplay?.matchesSnapshot,
      ),
    ).toBe(true);
  });

  it("rejects persisted menu-item lines that are missing mandatory replay evidence", async () => {
    const broken = line("broken", "BASE_STATUS", "MENU_ITEM");
    broken.pricingReplayEvidence = null as never;
    findById.mockResolvedValue({
      id: "order",
      branchId: "branch",
      status: "OPEN",
      kitchenTickets: [],
      customerId: null,
      customerGroupId: null,
      resolutionAsOf: new Date("2026-08-30T10:00:00.000Z"),
      createdAt: new Date("2026-08-30T10:00:01.000Z"),
      subtotal: "10.00",
      discountAmount: "0.00",
      taxAmount: "0.50",
      serviceChargeAmount: "0.00",
      roundingAdjustment: "0.00",
      totalAmount: "10.50",
      items: [broken],
    });

    await expect(
      orderExplainService.explainOrder(auth, "order"),
    ).rejects.toBeInstanceOf(InternalError);
    expect(getEffectiveItem).not.toHaveBeenCalled();
    expect(price).not.toHaveBeenCalled();
  });

  it("uses the exact resolution timestamp rather than the later database createdAt timestamp", async () => {
    const explained = await orderExplainService.explainOrder(auth, "order");
    expect(
      explained.lines.every(
        (entry) => entry.asOf === "2026-08-30T10:00:00.000Z",
      ),
    ).toBe(true);
  });
});
