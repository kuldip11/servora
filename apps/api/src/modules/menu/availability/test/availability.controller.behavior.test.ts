import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  writeAudit: vi.fn(),
  record: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  getUnavailableDashboard: vi.fn(),
  setManualStockCount: vi.fn(),
  setVariantOverride: vi.fn(),
  listSchedulesForItem: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  getEffectiveStatus: vi.fn(),
  listHolidays: vi.fn(),
  createHoliday: vi.fn(),
  updateHoliday: vi.fn(),
  deleteHoliday: vi.fn(),
  getEffectiveItem: vi.fn(),
  setManualOverride: vi.fn(),
  clearManualOverride: vi.fn(),
  upsertOverride: vi.fn(),
  deleteOverride: vi.fn(),
  listOverridesForItem: vi.fn(),
  listChannelOverrides: vi.fn(),
  upsertChannelOverride: vi.fn(),
  deleteChannelOverride: vi.fn(),
}));

vi.mock("@/core/auth", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/core/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({
  menuChangeLog: { record: mocks.record },
}));
vi.mock("@/modules/branches/branch.repository", () => ({
  branchRepository: { findById: mocks.findById, findMany: mocks.findMany },
}));
vi.mock("../availability.service", () => ({
  availabilityService: {
    getUnavailableDashboard: mocks.getUnavailableDashboard,
    setManualStockCount: mocks.setManualStockCount,
    setVariantOverride: mocks.setVariantOverride,
    listSchedulesForItem: mocks.listSchedulesForItem,
    createSchedule: mocks.createSchedule,
    updateSchedule: mocks.updateSchedule,
    deleteSchedule: mocks.deleteSchedule,
    getEffectiveStatus: mocks.getEffectiveStatus,
    listHolidays: mocks.listHolidays,
    createHoliday: mocks.createHoliday,
    updateHoliday: mocks.updateHoliday,
    deleteHoliday: mocks.deleteHoliday,
    getEffectiveItem: mocks.getEffectiveItem,
    setManualOverride: mocks.setManualOverride,
    clearManualOverride: mocks.clearManualOverride,
    upsertOverride: mocks.upsertOverride,
    deleteOverride: mocks.deleteOverride,
    listOverridesForItem: mocks.listOverridesForItem,
    listChannelOverrides: mocks.listChannelOverrides,
    upsertChannelOverride: mocks.upsertChannelOverride,
    deleteChannelOverride: mocks.deleteChannelOverride,
  },
}));

import { availabilityController } from "../availability.controller";

const auth = (overrides: Record<string, unknown> = {}) =>
  ({
    userId: "u1",
    tenantId: "t1",
    email: "u@x",
    branchId: "b1",
    tenantWide: false,
    authorizedBranchIds: ["b1"],
    permissions: ["menu:read", "menu:update"],
    roles: [],
    requestId: "r1",
    ipAddress: "127.0.0.1",
    ...overrides,
  }) as any;

const now = new Date("2026-01-01T00:00:00.000Z");
const uuid = {
  tenant: "11111111-1111-4111-8111-111111111111",
  branch: "22222222-2222-4222-8222-222222222222",
  item: "33333333-3333-4333-8333-333333333333",
  variant: "44444444-4444-4444-8444-444444444444",
  schedule: "55555555-5555-4555-8555-555555555555",
  holiday: "66666666-6666-4666-8666-666666666666",
  override: "77777777-7777-4777-8777-777777777777",
  channel: "88888888-8888-4888-8888-888888888888",
  user: "99999999-9999-4999-8999-999999999999",
};

const scheduleRow = () => ({
  id: uuid.schedule,
  tenantId: uuid.tenant,
  menuItemId: uuid.item,
  branchId: null,
  scheduleType: "DAILY" as const,
  startTime: "09:00",
  endTime: "17:00",
  dayOfWeek: null,
  startDate: null,
  endDate: null,
  holidayName: null,
  statusDuringPeriod: "ACTIVE" as const,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});
const holidayRow = () => ({
  id: uuid.holiday,
  tenantId: uuid.tenant,
  name: "Holiday",
  holidayDate: "2026-01-01",
  region: null,
  createdAt: now,
});
const itemState = () => ({
  id: uuid.item,
  tenantId: uuid.tenant,
  branchId: null,
  status: "ACTIVE" as const,
  availabilityReason: null,
  manualOverrideStatus: null,
  manualOverrideReason: null,
  manualOverrideSetBy: null,
  manualOverrideSetAt: null,
  manualStockCount: null,
  manualStockCountUpdatedAt: null,
});
const branchOverride = () => ({
  id: uuid.override,
  tenantId: uuid.tenant,
  menuItemId: uuid.item,
  branchId: uuid.branch,
  price: null,
  taxRate: null,
  prepTimeMinutes: null,
  status: "ACTIVE" as const,
  isHidden: false,
  availabilityReason: null,
  createdAt: now,
  updatedAt: now,
});
const channelOverride = () => ({
  id: uuid.channel,
  tenantId: uuid.tenant,
  menuItemId: uuid.item,
  channel: "STAFF",
  fulfillmentType: null,
  status: "ACTIVE" as const,
  isHidden: false,
  availabilityReason: null,
  createdAt: now,
  updatedAt: now,
});
const effectiveItem = () => ({
  id: uuid.item,
  branchId: null,
  status: "ACTIVE" as const,
  basePrice: "10.00",
  taxRate: "5.00",
  prepTimeMinutes: 10,
  manualOverrideStatus: null,
  manualOverrideReason: null,
  manualStockCount: null,
  effectivePrice: "10.00",
  effectiveTaxRate: "5.00",
  effectivePrepTimeMinutes: 10,
  effectiveStatus: "ACTIVE" as const,
  isHidden: false,
  availabilityReason: "Available",
  availabilityCause: "BASE_STATUS" as const,
  overrideApplied: false,
});
const stockRow = (variant = false) => ({
  id: variant ? uuid.variant : uuid.item,
  tenantId: uuid.tenant,
  branchId: null,
  categoryId: uuid.item,
  name: "x",
  description: null,
  basePrice: "10.00",
  manualCost: null,
  pricingMode: "FIXED" as const,
  weightUnit: null,
  openPriceMin: null,
  openPriceMax: null,
  supportsZones: false,
  zonePricingRule: "AVERAGE" as const,
  manualStockCount: 3,
  manualStockCountUpdatedAt: now,
  taxRate: "5.00",
  taxMode: null,
  isAvailable: true,
  imageUrl: null,
  foodType: "VEG" as const,
  spiceLevel: null,
  sku: null,
  prepTimeMinutes: null,
  sortOrder: 0,
  hsnCode: null,
  status: "ACTIVE" as const,
  availabilityReason: null,
  statusChangedAt: now,
  manualOverrideStatus: null,
  manualOverrideReason: null,
  manualOverrideSetBy: null,
  manualOverrideSetAt: null,
  enableRecipeDeduction: false,
  displayMode: "STANDARD" as const,
  effectiveFrom: null,
  isPublished: true,
  publishedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  menuItemId: uuid.item,
  entityType: variant ? ("VARIANT" as const) : ("ITEM" as const),
  ...(variant ? { price: "10.00" } : {}),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.record.mockResolvedValue(undefined);
  mocks.writeAudit.mockResolvedValue(undefined);
});

describe("availability controller comprehensive coverage", () => {
  it("builds dashboard for current branch and fallback branch metadata", async () => {
    mocks.findById.mockResolvedValueOnce(undefined);
    mocks.getUnavailableDashboard.mockResolvedValueOnce({
      asOf: now.toISOString(),
      branches: ["b1"],
      channels: ["STAFF"],
      fulfillmentTypes: ["DINE_IN"],
      rows: [
        {
          entityType: "ITEM",
          entityId: uuid.item,
          menuItemId: uuid.item,
          name: "A",
          status: "ACTIVE",
          reason: "r",
          cause: "BASE_STATUS",
          branchId: "b1",
          channel: "STAFF",
          fulfillmentType: "DINE_IN",
        },
        {
          entityType: "ITEM",
          entityId: uuid.item,
          menuItemId: uuid.item,
          name: "B",
          status: "ACTIVE",
          reason: "r",
          cause: "BASE_STATUS",
          branchId: "missing",
          channel: "STAFF",
          fulfillmentType: "DINE_IN",
        },
      ],
    });
    const out = await availabilityController.dashboard(auth(), {});
    expect(out.data.rows[0]!.branchName).toBe("Current branch");
    expect(out.data.rows[1]!.branchName).toBe("missing");
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      expect.anything(),
      "menu:read",
    );
  });

  it("builds dashboard for tenant-wide and scoped branch lists", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "b2", name: "Two" }]);
    mocks.getUnavailableDashboard.mockResolvedValueOnce({
      asOf: now.toISOString(),
      branches: ["b2"],
      channels: ["STAFF"],
      fulfillmentTypes: ["DINE_IN"],
      rows: [
        {
          entityType: "ITEM",
          entityId: uuid.item,
          menuItemId: uuid.item,
          name: "A",
          status: "ACTIVE",
          reason: "r",
          cause: "BASE_STATUS",
          branchId: "b2",
          channel: "STAFF",
          fulfillmentType: "DINE_IN",
        },
        {
          entityType: "ITEM",
          entityId: uuid.item,
          menuItemId: uuid.item,
          name: "B",
          status: "ACTIVE",
          reason: "r",
          cause: "BASE_STATUS",
          branchId: "missing",
          channel: "STAFF",
          fulfillmentType: "DINE_IN",
        },
      ],
    });
    let out = await availabilityController.dashboard(
      auth({ branchId: null, tenantWide: true }),
      { cause: "stock" },
    );
    expect(out.data.rows.map((r: any) => r.branchName)).toEqual([
      "Two",
      "missing",
    ]);
    expect(mocks.findMany).toHaveBeenLastCalledWith("t1", undefined, undefined);

    mocks.findMany.mockResolvedValueOnce([{ id: "b1", name: "One" }]);
    mocks.getUnavailableDashboard.mockResolvedValueOnce({
      asOf: now.toISOString(),
      branches: ["b1"],
      channels: ["STAFF"],
      fulfillmentTypes: ["DINE_IN"],
      rows: [],
    });
    out = await availabilityController.dashboard(
      auth({ branchId: null, tenantWide: false, authorizedBranchIds: ["b1"] }),
      {},
    );
    expect(out.data.rows).toEqual([]);
    expect(mocks.findMany).toHaveBeenLastCalledWith("t1", undefined, ["b1"]);
  });

  it("handles stock counts and variant overrides", async () => {
    mocks.setManualStockCount.mockResolvedValue(stockRow(false));
    await availabilityController.setStockCount(auth(), "i1", { count: 3 });
    expect(mocks.writeAudit).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity: "menu_item", entityId: "i1" }),
    );
    await availabilityController.setStockCount(auth(), "i1", {
      count: null,
      variantId: "v1",
    });
    expect(mocks.writeAudit).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity: "menu_item_variant", entityId: "v1" }),
    );
    mocks.setVariantOverride.mockResolvedValue({
      id: uuid.variant,
      menuItemId: uuid.item,
      name: "V",
      price: "10.00",
      status: "ACTIVE",
      manualStockCount: null,
      manualOverrideStatus: "ACTIVE",
      manualOverrideReason: null,
      manualStockCountUpdatedAt: null,
    });
    await availabilityController.setVariantOverride(auth(), "v1", {
      status: "ACTIVE",
    });
    expect(mocks.setVariantOverride).toHaveBeenCalledWith(
      "t1",
      "v1",
      "ACTIVE",
      null,
    );
  });

  it("covers schedule lifecycle and current status timestamp choices", async () => {
    mocks.listSchedulesForItem.mockResolvedValue([]);
    await availabilityController.listSchedules(auth(), "i1");
    mocks.createSchedule.mockResolvedValue(scheduleRow());
    const created = await availabilityController.createSchedule(auth(), "i1", {
      name: "Lunch",
    } as any);
    expect(created.data.id).toBe(uuid.schedule);
    mocks.updateSchedule.mockResolvedValue(scheduleRow());
    await availabilityController.updateSchedule(auth(), "s1", {
      name: "Dinner",
    } as any);
    await availabilityController.deleteSchedule(auth(), "s1");
    mocks.getEffectiveStatus.mockResolvedValue({ status: "ACTIVE" });
    await availabilityController.getCurrentStatus(
      auth(),
      "i1",
      "2026-01-01T00:00:00.000Z",
    );
    expect(
      mocks.getEffectiveStatus.mock.calls.at(-1)?.[3].asOf.toISOString(),
    ).toBe("2026-01-01T00:00:00.000Z");
    await availabilityController.getCurrentStatus(
      auth({ branchId: null }),
      "i1",
      undefined,
    );
    expect(mocks.getEffectiveStatus.mock.calls.at(-1)?.[2]).toBeUndefined();
  });

  it("covers holiday list/create/update/delete and create failure", async () => {
    mocks.listHolidays.mockResolvedValue([]);
    await availabilityController.listHolidays(auth(), "2026", "IN");
    expect(mocks.listHolidays).toHaveBeenCalledWith("t1", 2026, "IN");
    await availabilityController.listHolidays(auth(), undefined, undefined);
    expect(mocks.listHolidays).toHaveBeenLastCalledWith(
      "t1",
      undefined,
      undefined,
    );
    mocks.createHoliday.mockResolvedValueOnce(holidayRow());
    await availabilityController.createHoliday(auth(), {
      name: "Holiday",
      holidayDate: "2026-01-01",
    });
    mocks.createHoliday.mockResolvedValueOnce(undefined);
    await expect(
      availabilityController.createHoliday(auth(), {
        name: "Bad",
        holidayDate: "2026-02-01",
      }),
    ).rejects.toThrow("Holiday could not be created");
    mocks.updateHoliday.mockResolvedValue(holidayRow());
    await availabilityController.updateHoliday(auth(), "h1", {
      name: "Renamed",
      region: null,
    });
    await availabilityController.deleteHoliday(auth(), "h1");
  });

  it("covers effective item, manual overrides, branch overrides, and channel overrides", async () => {
    mocks.getEffectiveItem.mockResolvedValue(effectiveItem());
    await availabilityController.getEffectiveItem(auth(), "i1", "b1");
    mocks.setManualOverride.mockResolvedValue(itemState());
    await availabilityController.setManualOverride(auth(), "i1", {
      status: "OUT_OF_STOCK",
      reason: "  sold out  ",
    } as any);
    expect(mocks.record).toHaveBeenLastCalledWith(
      expect.anything(),
      "AVAILABILITY",
      "i1",
      "UPDATED",
      expect.objectContaining({ reason: "sold out" }),
    );
    mocks.clearManualOverride.mockResolvedValue(itemState());
    await availabilityController.clearManualOverride(auth(), "i1");
    mocks.upsertOverride.mockResolvedValue(branchOverride());
    await availabilityController.upsertOverride(auth(), "i1", "b1", {
      status: "ACTIVE",
    } as any);
    await availabilityController.deleteOverride(auth(), "i1", "b1");
    mocks.listOverridesForItem.mockResolvedValue([]);
    await availabilityController.listOverridesForItem(auth(), "i1");
    mocks.listChannelOverrides.mockResolvedValue([]);
    await availabilityController.listChannelOverrides(auth(), "i1");
    mocks.upsertChannelOverride.mockResolvedValue(channelOverride());
    await availabilityController.upsertChannelOverride(auth(), "i1", {
      channel: "STAFF",
    } as any);
    await availabilityController.deleteChannelOverride(auth(), "co1");
  });
});
