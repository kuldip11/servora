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
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({ menuChangeLog: { record: mocks.record } }));
vi.mock("@/modules/branches/branch.repository", () => ({ branchRepository: { findById: mocks.findById, findMany: mocks.findMany } }));
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

const auth = (overrides: Record<string, unknown> = {}) => ({
  userId: "u1", tenantId: "t1", email: "u@x", branchId: "b1", tenantWide: false,
  authorizedBranchIds: ["b1"], permissions: ["menu:read", "menu:update"], roles: [],
  requestId: "r1", ipAddress: "127.0.0.1", ...overrides,
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.record.mockResolvedValue(undefined);
  mocks.writeAudit.mockResolvedValue(undefined);
});

describe("availability controller comprehensive coverage", () => {
  it("builds dashboard for current branch and fallback branch metadata", async () => {
    mocks.findById.mockResolvedValueOnce(undefined);
    mocks.getUnavailableDashboard.mockResolvedValueOnce({ rows: [{ branchId: "b1", id: "r" }, { branchId: 3, id: "x" }] });
    const out = await availabilityController.dashboard(auth(), {});
    expect(out.data.rows[0]!.branchName).toBe("Current branch");
    expect(out.data.rows[1]!.branchName).toBe("");
    expect(mocks.requirePermission).toHaveBeenCalledWith(expect.anything(), "menu:read");
  });

  it("builds dashboard for tenant-wide and scoped branch lists", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "b2", name: "Two" }]);
    mocks.getUnavailableDashboard.mockResolvedValueOnce({ rows: [{ branchId: "b2" }, { branchId: "missing" }] });
    let out = await availabilityController.dashboard(auth({ branchId: null, tenantWide: true }), { cause: "stock" });
    expect(out.data.rows.map((r: any) => r.branchName)).toEqual(["Two", "missing"]);
    expect(mocks.findMany).toHaveBeenLastCalledWith("t1", undefined, undefined);

    mocks.findMany.mockResolvedValueOnce([{ id: "b1", name: "One" }]);
    mocks.getUnavailableDashboard.mockResolvedValueOnce({ rows: [] });
    out = await availabilityController.dashboard(auth({ branchId: null, tenantWide: false, authorizedBranchIds: ["b1"] }), {});
    expect(out.data.rows).toEqual([]);
    expect(mocks.findMany).toHaveBeenLastCalledWith("t1", undefined, ["b1"]);
  });

  it("handles stock counts and variant overrides", async () => {
    mocks.setManualStockCount.mockResolvedValue({ id: "i1" });
    await availabilityController.setStockCount(auth(), "i1", { count: 3 });
    expect(mocks.writeAudit).toHaveBeenLastCalledWith(expect.objectContaining({ entity: "menu_item", entityId: "i1" }));
    await availabilityController.setStockCount(auth(), "i1", { count: null, variantId: "v1" });
    expect(mocks.writeAudit).toHaveBeenLastCalledWith(expect.objectContaining({ entity: "menu_item_variant", entityId: "v1" }));
    mocks.setVariantOverride.mockResolvedValue({ id: "v1" });
    await availabilityController.setVariantOverride(auth(), "v1", { status: "ACTIVE" });
    expect(mocks.setVariantOverride).toHaveBeenCalledWith("t1", "v1", "ACTIVE", null);
  });

  it("covers schedule lifecycle and current status timestamp choices", async () => {
    mocks.listSchedulesForItem.mockResolvedValue([]);
    await availabilityController.listSchedules(auth(), "i1");
    mocks.createSchedule.mockResolvedValue({ id: "s1" });
    const created = await availabilityController.createSchedule(auth(), "i1", { name: "Lunch" } as any);
    expect(created.data.id).toBe("s1");
    mocks.updateSchedule.mockResolvedValue({ id: "s1" });
    await availabilityController.updateSchedule(auth(), "s1", { name: "Dinner" } as any);
    await availabilityController.deleteSchedule(auth(), "s1");
    mocks.getEffectiveStatus.mockResolvedValue({ status: "ACTIVE" });
    await availabilityController.getCurrentStatus(auth(), "i1", "2026-01-01T00:00:00.000Z");
    expect(mocks.getEffectiveStatus.mock.calls.at(-1)?.[3].asOf.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    await availabilityController.getCurrentStatus(auth({ branchId: null }), "i1", undefined);
    expect(mocks.getEffectiveStatus.mock.calls.at(-1)?.[2]).toBeUndefined();
  });

  it("covers holiday list/create/update/delete and create failure", async () => {
    mocks.listHolidays.mockResolvedValue([]);
    await availabilityController.listHolidays(auth(), "2026", "IN");
    expect(mocks.listHolidays).toHaveBeenCalledWith("t1", 2026, "IN");
    await availabilityController.listHolidays(auth(), undefined, undefined);
    expect(mocks.listHolidays).toHaveBeenLastCalledWith("t1", undefined, undefined);
    mocks.createHoliday.mockResolvedValueOnce({ id: "h1" });
    await availabilityController.createHoliday(auth(), { name: "Holiday", holidayDate: "2026-01-01" });
    mocks.createHoliday.mockResolvedValueOnce(undefined);
    await expect(availabilityController.createHoliday(auth(), { name: "Bad", holidayDate: "2026-02-01" })).rejects.toThrow("Holiday could not be created");
    mocks.updateHoliday.mockResolvedValue({ id: "h1" });
    await availabilityController.updateHoliday(auth(), "h1", { name: "Renamed", region: null });
    await availabilityController.deleteHoliday(auth(), "h1");
  });

  it("covers effective item, manual overrides, branch overrides, and channel overrides", async () => {
    mocks.getEffectiveItem.mockResolvedValue({ id: "i1" });
    await availabilityController.getEffectiveItem(auth(), "i1", "b1");
    mocks.setManualOverride.mockResolvedValue({ id: "i1" });
    await availabilityController.setManualOverride(auth(), "i1", { status: "OUT_OF_STOCK", reason: "  sold out  " } as any);
    expect(mocks.record).toHaveBeenLastCalledWith(expect.anything(), "AVAILABILITY", "i1", "UPDATED", expect.objectContaining({ reason: "sold out" }));
    mocks.clearManualOverride.mockResolvedValue({ id: "i1" });
    await availabilityController.clearManualOverride(auth(), "i1");
    mocks.upsertOverride.mockResolvedValue({ id: "o1" });
    await availabilityController.upsertOverride(auth(), "i1", "b1", { status: "ACTIVE" } as any);
    await availabilityController.deleteOverride(auth(), "i1", "b1");
    mocks.listOverridesForItem.mockResolvedValue([]);
    await availabilityController.listOverridesForItem(auth(), "i1");
    mocks.listChannelOverrides.mockResolvedValue([]);
    await availabilityController.listChannelOverrides(auth(), "i1");
    mocks.upsertChannelOverride.mockResolvedValue({ id: "co1" });
    await availabilityController.upsertChannelOverride(auth(), "i1", { channel: "STAFF" } as any);
    await availabilityController.deleteChannelOverride(auth(), "co1");
  });
});
