import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureDefaultMenu,
  list,
  listActive,
  findById,
  create,
  update,
  remove,
  listSchedules,
  createSchedule,
  deleteSchedule,
} = vi.hoisted(() => ({
  ensureDefaultMenu: vi
    .fn()
    .mockResolvedValue({ id: "default", isDefault: true }),
  list: vi.fn(),
  listActive: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  listSchedules: vi.fn(),
  createSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}));
const { record } = vi.hoisted(() => ({
  record: vi.fn().mockResolvedValue({ id: "event1" }),
}));

vi.mock("../menu.repository", () => ({
  menuRepository: {
    ensureDefaultMenu,
    list,
    listActive,
    findById,
    create,
    update,
    remove,
    listSchedules,
    createSchedule,
    deleteSchedule,
  },
}));
vi.mock("../../change-log/menu-change-log", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../change-log/menu-change-log")
  >()),
  menuChangeLog: { record },
}));

import { menuService } from "@/modules/menu/menus/menu.service";

const auth = (permissions: string[], branchId: string | null = null) => ({
  userId: "u1",
  tenantId: "t1",
  branchId,
  email: "owner@example.com",
  roles: [],
  permissions,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("menu service", () => {
  it("keeps reads tenant scoped and permission guarded", async () => {
    list.mockResolvedValue([{ id: "m1" }]);
    await expect(menuService.list(auth(["menu:read"]))).resolves.toEqual([
      { id: "m1" },
    ]);
    expect(ensureDefaultMenu).toHaveBeenCalledWith("t1");
    expect(list).toHaveBeenCalledWith("t1");
    await expect(menuService.list(auth([]))).rejects.toThrow(
      "Insufficient permissions",
    );
  });

  it("repairs the default menu before resolving orderable menus", async () => {
    listActive.mockResolvedValue([{ id: "default", status: "PUBLISHED" }]);
    await expect(
      menuService.listActive(auth(["menu:read"], "b1"), "STAFF", "DINE_IN"),
    ).resolves.toEqual([{ id: "default", status: "PUBLISHED" }]);
    expect(ensureDefaultMenu).toHaveBeenCalledWith("t1");
    expect(listActive).toHaveBeenCalledWith("t1", "b1", "STAFF", "DINE_IN");
  });

  it("creates draft menus through the tenant repository", async () => {
    create.mockResolvedValue({ id: "m2", status: "DRAFT" });
    await expect(
      menuService.create(auth(["menu:create"]), { name: "Weekend" }),
    ).resolves.toMatchObject({ id: "m2", status: "DRAFT" });
    expect(create).toHaveBeenCalledWith({ tenantId: "t1", name: "Weekend" });
  });

  it("publishes and unpublishes an existing menu", async () => {
    findById.mockResolvedValue({ id: "m1", isDefault: false });
    update
      .mockResolvedValueOnce({ id: "m1", status: "PUBLISHED" })
      .mockResolvedValueOnce({ id: "m1", status: "DRAFT" });
    await menuService.publish(auth(["menu:publish"]), "m1");
    await menuService.unpublish(auth(["menu:publish"]), "m1");
    expect(update).toHaveBeenNthCalledWith(1, "t1", "m1", {
      status: "PUBLISHED",
    });
    expect(update).toHaveBeenNthCalledWith(2, "t1", "m1", {
      status: "DRAFT",
    });
  });

  it("keeps the automatic default menu published", async () => {
    findById.mockResolvedValue({ id: "default", isDefault: true });
    await expect(
      menuService.unpublish(auth(["menu:publish"]), "default"),
    ).rejects.toThrow("Default Menu must stay published");
    expect(update).not.toHaveBeenCalled();
  });

  it("protects the tenant's default menu from deletion", async () => {
    findById.mockResolvedValue({ id: "m1", isDefault: true });
    await expect(
      menuService.remove(auth(["menu:delete"]), "m1"),
    ).rejects.toThrow("Default Menu cannot be deleted");
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("menu service comprehensive coverage", () => {
  it("gets an existing menu and rejects missing menus", async () => {
    findById.mockResolvedValueOnce({ id: "m1" });
    await expect(
      menuService.getById(auth(["menu:read"]), "m1"),
    ).resolves.toEqual({ id: "m1" });
    findById.mockResolvedValueOnce(undefined);
    await expect(
      menuService.getById(auth(["menu:read"]), "missing"),
    ).rejects.toThrow();
  });
  it("returns no active menus without a branch", async () => {
    await expect(
      menuService.listActive(auth(["menu:read"]), "STAFF", "DINE_IN"),
    ).resolves.toEqual([]);
    expect(listActive).not.toHaveBeenCalled();
  });
  it("updates effective dates for string, null, and omitted values and handles races", async () => {
    findById.mockResolvedValue({ id: "m1", name: "Old" });
    update.mockResolvedValue({ id: "m1", name: "New" });
    await menuService.update(auth(["menu:update"]), "m1", {
      name: "New",
      effectiveFrom: "2026-09-01T00:00:00.000Z",
    });
    expect(update).toHaveBeenLastCalledWith(
      "t1",
      "m1",
      expect.objectContaining({ effectiveFrom: expect.any(Date) }),
    );
    await menuService.update(auth(["menu:update"]), "m1", {
      effectiveFrom: null,
    });
    expect(update).toHaveBeenLastCalledWith("t1", "m1", {
      effectiveFrom: null,
    });
    await menuService.update(auth(["menu:update"]), "m1", { name: "Only" });
    expect(update).toHaveBeenLastCalledWith("t1", "m1", { name: "Only" });
    update.mockResolvedValueOnce(undefined);
    await expect(
      menuService.update(auth(["menu:update"]), "m1", { name: "Race" }),
    ).rejects.toThrow();
  });
  it("handles publish/unpublish update races and normal removal", async () => {
    findById.mockResolvedValue({ id: "m1", isDefault: false });
    update.mockResolvedValueOnce(undefined);
    await expect(
      menuService.publish(auth(["menu:publish"]), "m1"),
    ).rejects.toThrow();
    update.mockResolvedValueOnce(undefined);
    await expect(
      menuService.unpublish(auth(["menu:publish"]), "m1"),
    ).rejects.toThrow();
    remove.mockResolvedValue(undefined);
    await menuService.remove(auth(["menu:delete"]), "m1");
    expect(remove).toHaveBeenCalledWith("t1", "m1");
  });
  it("lists, validates, creates, and deletes schedules", async () => {
    findById.mockResolvedValue({ id: "m1", isDefault: false });
    listSchedules.mockResolvedValue([{ id: "s1" }]);
    await expect(
      menuService.listSchedules(auth(["menu:read"]), "m1"),
    ).resolves.toEqual([{ id: "s1" }]);
    for (const input of [
      { scheduleType: "DAILY" },
      { scheduleType: "WEEKLY", startTime: "09:00", endTime: "10:00" },
      { scheduleType: "SPECIFIC_DATE" },
      { scheduleType: "HOLIDAY" },
    ] as any[])
      await expect(
        menuService.createSchedule(auth(["menu:read"]), "m1", input),
      ).rejects.toThrow();
    createSchedule.mockResolvedValue({ id: "s1" });
    await menuService.createSchedule(auth(["menu:read"]), "m1", {
      scheduleType: "WEEKLY",
      startTime: "09:00",
      endTime: "10:00",
      dayOfWeek: 1,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      holidayName: "X",
      isActive: false,
    });
    expect(createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        menuId: "m1",
        dayOfWeek: 1,
        isActive: false,
      }),
    );
    await menuService.createSchedule(auth(["menu:read"]), "m1", {
      scheduleType: "HOLIDAY",
      holidayName: "Festival",
    });
    expect(createSchedule).toHaveBeenLastCalledWith({
      tenantId: "t1",
      menuId: "m1",
      scheduleType: "HOLIDAY",
      holidayName: "Festival",
    });
    await menuService.createSchedule(auth(["menu:read"]), "m1", {
      scheduleType: "SPECIFIC_DATE",
      startDate: "2026-09-05",
    });
    expect(createSchedule).toHaveBeenLastCalledWith({
      tenantId: "t1",
      menuId: "m1",
      scheduleType: "SPECIFIC_DATE",
      startDate: "2026-09-05",
    });
    deleteSchedule.mockResolvedValue(undefined);
    await expect(
      menuService.deleteSchedule(auth(["menu:read"]), "s1"),
    ).resolves.toBeUndefined();
  });
});
