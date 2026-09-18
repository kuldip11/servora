import { beforeEach, describe, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  list: vi.fn(),
  listActive: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  remove: vi.fn(),
  listSchedules: vi.fn(),
  createSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}));

vi.mock("../menu.service", () => ({ menuService: s }));

import { menuController } from "@/modules/menu/menus/menu.controller";

const menuId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";
const scheduleId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-09-18T00:00:00.000Z");
const auth = { tenantId } as any;

const menu = {
  id: menuId,
  tenantId,
  organizationId: null,
  name: "M",
  description: null,
  status: "PUBLISHED" as const,
  isDefault: true,
  availableChannels: ["STAFF"],
  availableFulfillmentTypes: ["DINE_IN"],
  availableBranchIds: null,
  effectiveFrom: null,
  createdAt: now,
  updatedAt: now,
};

const schedule = {
  id: scheduleId,
  tenantId,
  menuId,
  scheduleType: "DAILY" as const,
  startTime: "08:00:00",
  endTime: "22:00:00",
  dayOfWeek: null,
  startDate: null,
  endDate: null,
  holidayName: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe("menuController coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s.list.mockResolvedValue([menu]);
    s.listActive.mockResolvedValue([{ ...menu, memberships: [] }]);
    s.getById.mockResolvedValue(menu);
    s.create.mockResolvedValue(menu);
    s.update.mockResolvedValue(menu);
    s.publish.mockResolvedValue(menu);
    s.unpublish.mockResolvedValue({ ...menu, status: "DRAFT" });
    s.remove.mockResolvedValue(undefined);
    s.listSchedules.mockResolvedValue([schedule]);
    s.createSchedule.mockResolvedValue(schedule);
    s.deleteSchedule.mockResolvedValue(undefined);
  });

  it("delegates every action and wraps responses", async () => {
    await expect(menuController.list(auth)).resolves.toMatchObject({
      success: true,
      data: [{ id: menuId }],
    });
    await expect(
      menuController.listActive(auth, "STAFF", "DINE_IN"),
    ).resolves.toMatchObject({
      success: true,
      data: [{ id: menuId, memberships: [] }],
    });
    await expect(menuController.getById(auth, menuId)).resolves.toMatchObject({
      success: true,
      data: { id: menuId },
    });
    await expect(
      menuController.create(auth, { name: "M" }),
    ).resolves.toMatchObject({ success: true, data: { id: menuId } });
    await menuController.update(auth, menuId, { name: "N" });
    await menuController.publish(auth, menuId);
    await menuController.unpublish(auth, menuId);
    await expect(menuController.remove(auth, menuId)).resolves.toMatchObject({
      data: null,
    });
    await expect(
      menuController.listSchedules(auth, menuId),
    ).resolves.toMatchObject({ success: true, data: [{ id: scheduleId }] });
    await menuController.createSchedule(auth, menuId, {
      scheduleType: "DAILY",
    });
    await expect(
      menuController.deleteSchedule(auth, scheduleId),
    ).resolves.toMatchObject({ data: null });
    expect(s.listActive).toHaveBeenCalledWith(auth, "STAFF", "DINE_IN");
    expect(s.createSchedule).toHaveBeenCalledWith(auth, menuId, {
      scheduleType: "DAILY",
    });
  });
});
