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
const auth = { tenantId: "t1" } as any;
describe("menuController coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(s).forEach((fn: any) => fn.mockResolvedValue({ id: "x" }));
    s.remove.mockResolvedValue(undefined);
    s.deleteSchedule.mockResolvedValue(undefined);
  });
  it("delegates every action and wraps responses", async () => {
    await expect(menuController.list(auth)).resolves.toMatchObject({
      success: true,
    });
    await menuController.listActive(auth, "STAFF", "DINE_IN");
    await menuController.getById(auth, "m1");
    await expect(
      menuController.create(auth, { name: "M" }),
    ).resolves.toMatchObject({ success: true });
    await menuController.update(auth, "m1", { name: "N" });
    await menuController.publish(auth, "m1");
    await menuController.unpublish(auth, "m1");
    await expect(menuController.remove(auth, "m1")).resolves.toMatchObject({
      data: null,
    });
    await menuController.listSchedules(auth, "m1");
    await menuController.createSchedule(auth, "m1", { scheduleType: "DAILY" });
    await expect(
      menuController.deleteSchedule(auth, "s1"),
    ).resolves.toMatchObject({ data: null });
    expect(s.listActive).toHaveBeenCalledWith(auth, "STAFF", "DINE_IN");
    expect(s.createSchedule).toHaveBeenCalledWith(auth, "m1", {
      scheduleType: "DAILY",
    });
  });
});
