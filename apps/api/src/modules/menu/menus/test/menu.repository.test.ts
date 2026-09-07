import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  txMenuFindFirst: vi.fn(),
  txItemFindMany: vi.fn(),
  txInsertValues: vi.fn(),
  txOnConflict: vi.fn(),
  txReturning: vi.fn(),
  transaction: vi.fn(),
  menuFindMany: vi.fn(),
  menuFindFirst: vi.fn(),
  scheduleFindMany: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  deleteWhere: vi.fn(),
  deleteReturning: vi.fn(),
  resolver: vi.fn(),
}));
vi.mock("../menu-resolver.service", () => ({
  menuResolver: { getActiveMenus: m.resolver },
}));
vi.mock("../../../../db", () => ({
  db: {
    transaction: m.transaction,
    query: {
      menus: { findMany: m.menuFindMany, findFirst: m.menuFindFirst },
      menuSchedules: { findMany: m.scheduleFindMany },
    },
    insert: vi.fn(() => ({ values: m.insertValues })),
    update: vi.fn(() => ({ set: m.updateSet })),
    delete: vi.fn(() => ({ where: m.deleteWhere })),
  },
}));
import { menuRepository } from "@/modules/menu/menus/menu.repository";

describe("menuRepository coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.txOnConflict.mockImplementation(() => ({ returning: m.txReturning }));
    m.txInsertValues.mockImplementation(() => ({
      onConflictDoNothing: m.txOnConflict,
      returning: m.txReturning,
    }));
    const tx = {
      query: {
        menus: { findFirst: m.txMenuFindFirst },
        menuItems: { findMany: m.txItemFindMany },
      },
      insert: vi.fn(() => ({ values: m.txInsertValues })),
    };
    m.transaction.mockImplementation(async (fn: any) => fn(tx));
    m.insertValues.mockImplementation(() => ({ returning: m.insertReturning }));
    m.updateWhere.mockImplementation(() => ({ returning: m.updateReturning }));
    m.updateSet.mockImplementation(() => ({ where: m.updateWhere }));
    m.deleteWhere.mockImplementation(() => ({ returning: m.deleteReturning }));
    m.menuFindMany.mockResolvedValue([{ id: "m1" }]);
    m.menuFindFirst.mockResolvedValue({ id: "m1" });
    m.scheduleFindMany.mockResolvedValue([{ id: "s1" }]);
    m.insertReturning.mockResolvedValue([{ id: "m2" }]);
    m.updateReturning.mockResolvedValue([{ id: "m1" }]);
    m.deleteReturning.mockResolvedValue([{ id: "m1" }]);
    m.resolver.mockResolvedValue([{ id: "active" }]);
  });
  it("returns an existing default menu without creating", async () => {
    m.txMenuFindFirst.mockResolvedValueOnce({ id: "default" });
    await expect(menuRepository.ensureDefaultMenu("t1")).resolves.toEqual({
      id: "default",
    });
    expect(m.txInsertValues).not.toHaveBeenCalled();
  });
  it("creates a default and backfills existing items", async () => {
    m.txMenuFindFirst.mockResolvedValueOnce(undefined);
    m.txReturning.mockResolvedValueOnce([{ id: "default" }]);
    m.txItemFindMany.mockResolvedValueOnce([
      { id: "i1", categoryId: "c1", sortOrder: 2 },
    ]);
    await expect(menuRepository.ensureDefaultMenu("t1")).resolves.toEqual({
      id: "default",
    });
    expect(m.txInsertValues).toHaveBeenCalledTimes(2);
  });
  it("creates a default with no existing items", async () => {
    m.txMenuFindFirst.mockResolvedValueOnce(undefined);
    m.txReturning.mockResolvedValueOnce([{ id: "default" }]);
    m.txItemFindMany.mockResolvedValueOnce([]);
    await expect(menuRepository.ensureDefaultMenu("t1")).resolves.toEqual({
      id: "default",
    });
  });
  it("recovers a concurrent default and errors if it still cannot exist", async () => {
    m.txMenuFindFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "default" });
    m.txReturning.mockResolvedValueOnce([]);
    await expect(menuRepository.ensureDefaultMenu("t1")).resolves.toEqual({
      id: "default",
    });
    m.txMenuFindFirst.mockReset().mockResolvedValue(undefined);
    m.txReturning.mockResolvedValueOnce([]);
    await expect(menuRepository.ensureDefaultMenu("t1")).rejects.toThrow(
      "Default menu could not be created",
    );
  });
  it("covers list, active resolution, find, CRUD and schedules", async () => {
    await expect(menuRepository.list("t1")).resolves.toEqual([{ id: "m1" }]);
    await expect(
      menuRepository.listActive("t1", "b1", "STAFF", "DINE_IN"),
    ).resolves.toEqual([{ id: "active" }]);
    expect(m.resolver).toHaveBeenCalledWith(
      "t1",
      "b1",
      "STAFF",
      "DINE_IN",
      expect.any(Date),
    );
    await expect(menuRepository.findById("t1", "m1")).resolves.toEqual({
      id: "m1",
    });
    await expect(
      menuRepository.create({ tenantId: "t1", name: "Menu" }),
    ).resolves.toEqual({ id: "m2" });
    await expect(
      menuRepository.update("t1", "m1", { name: "New" }),
    ).resolves.toEqual({ id: "m1" });
    await expect(menuRepository.remove("t1", "m1")).resolves.toEqual({
      id: "m1",
    });
    await expect(menuRepository.listSchedules("t1", "m1")).resolves.toEqual([
      { id: "s1" },
    ]);
    await expect(
      menuRepository.createSchedule({
        tenantId: "t1",
        menuId: "m1",
        scheduleType: "DAILY",
      } as any),
    ).resolves.toEqual({ id: "m2" });
    m.deleteWhere.mockImplementationOnce(() => Promise.resolve(undefined));
    await expect(
      menuRepository.deleteSchedule("t1", "s1"),
    ).resolves.toBeUndefined();
  });
});
