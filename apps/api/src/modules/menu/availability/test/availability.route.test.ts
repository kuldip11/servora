vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: ((context: any) => unknown) | undefined }> = [];
    constructor(_options: unknown = {}) {}
    use(_plugin: unknown) { return this; }
    get(path: string, handler: ((context: any) => unknown) | undefined) { this.routes.push({ method: "GET", path, handler }); return this; }
    post(path: string, handler: ((context: any) => unknown) | undefined) { this.routes.push({ method: "POST", path, handler }); return this; }
    put(path: string, handler: ((context: any) => unknown) | undefined) { this.routes.push({ method: "PUT", path, handler }); return this; }
    delete(path: string, handler: ((context: any) => unknown) | undefined) { this.routes.push({ method: "DELETE", path, handler }); return this; }
  }
  return { ...actual, Elysia: FakeElysia };
});

const controller = vi.hoisted(() => ({
  dashboard: vi.fn().mockResolvedValue({ ok: true }),
  setVariantOverride: vi.fn().mockResolvedValue({ ok: true }),
  setStockCount: vi.fn().mockResolvedValue({ ok: true }),
  listSchedules: vi.fn().mockResolvedValue({ ok: true }),
  createSchedule: vi.fn().mockResolvedValue({ ok: true }),
  updateSchedule: vi.fn().mockResolvedValue({ ok: true }),
  deleteSchedule: vi.fn().mockResolvedValue({ ok: true }),
  getCurrentStatus: vi.fn().mockResolvedValue({ ok: true }),
  setManualOverride: vi.fn().mockResolvedValue({ ok: true }),
  clearManualOverride: vi.fn().mockResolvedValue({ ok: true }),
  getEffectiveItem: vi.fn().mockResolvedValue({ ok: true }),
  upsertOverride: vi.fn().mockResolvedValue({ ok: true }),
  deleteOverride: vi.fn().mockResolvedValue({ ok: true }),
  listOverridesForItem: vi.fn().mockResolvedValue({ ok: true }),
  listChannelOverrides: vi.fn().mockResolvedValue({ ok: true }),
  upsertChannelOverride: vi.fn().mockResolvedValue({ ok: true }),
  deleteChannelOverride: vi.fn().mockResolvedValue({ ok: true }),
  listHolidays: vi.fn().mockResolvedValue({ ok: true }),
  createHoliday: vi.fn().mockResolvedValue({ ok: true }),
  updateHoliday: vi.fn().mockResolvedValue({ ok: true }),
  deleteHoliday: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../availability.controller", () => ({ availabilityController: controller }));

import { describe, expect, it, vi } from "vitest";
import { menuAvailabilityRouter } from "../availability.route";

describe("availability.route routes", () => {
  it("executes every registered route handler", async () => {
    const routes = (menuAvailabilityRouter as any).routes as Array<{ method: string; path: string; handler: ((context: any) => unknown) | undefined }>;
    const route = (method: string, path: string) => routes.find((candidate) => candidate.method === method && candidate.path === path)!;
    const auth = { tenantId: "t1" };
    const base = { auth, params: { id: "i1", scheduleId: "s1", branchId: "b1" }, query: { timestamp: "2026-01-01T00:00:00.000Z", year: "2026", region: "IN" }, body: { status: "ACTIVE" } };

    const cases: Array<[string, string, keyof typeof controller]> = [
      ["GET", "/availability/dashboard", "dashboard"],
      ["PUT", "/variants/:id/availability", "setVariantOverride"],
      ["POST", "/items/:id/stock-count", "setStockCount"],
      ["GET", "/items/:id/schedules", "listSchedules"],
      ["POST", "/items/:id/schedules", "createSchedule"],
      ["PUT", "/items/schedules/:scheduleId", "updateSchedule"],
      ["DELETE", "/items/schedules/:scheduleId", "deleteSchedule"],
      ["GET", "/items/:id/current-status", "getCurrentStatus"],
      ["PUT", "/items/:id/manual-override", "setManualOverride"],
      ["DELETE", "/items/:id/manual-override", "clearManualOverride"],
      ["GET", "/items/:id/branch/:branchId", "getEffectiveItem"],
      ["PUT", "/items/:id/branch/:branchId", "upsertOverride"],
      ["DELETE", "/items/:id/branch/:branchId", "deleteOverride"],
      ["GET", "/items/:id/branches", "listOverridesForItem"],
      ["GET", "/items/:id/channel-overrides", "listChannelOverrides"],
      ["PUT", "/items/:id/channel-overrides", "upsertChannelOverride"],
      ["DELETE", "/items/channel-overrides/:id", "deleteChannelOverride"],
      ["GET", "/holidays", "listHolidays"],
      ["POST", "/holidays", "createHoliday"],
      ["PUT", "/holidays/:id", "updateHoliday"],
      ["DELETE", "/holidays/:id", "deleteHoliday"],
    ];
    for (const [method, path, controllerMethod] of cases) {
      const candidate = route(method, path);
      expect(candidate?.handler, `${method} ${path}`).toBeTypeOf("function");
      await candidate.handler!(base);
      expect(controller[controllerMethod]).toHaveBeenCalled();
    }

    expect(controller.dashboard).toHaveBeenCalledWith(auth, base.query);
    expect(controller.setVariantOverride).toHaveBeenCalledWith(auth, "i1", base.body);
    expect(controller.setStockCount).toHaveBeenCalledWith(auth, "i1", base.body);
    expect(controller.updateSchedule).toHaveBeenCalledWith(auth, "s1", base.body);
    expect(controller.getCurrentStatus).toHaveBeenCalledWith(auth, "i1", base.query.timestamp);
    expect(controller.getEffectiveItem).toHaveBeenCalledWith(auth, "i1", "b1");
    expect(controller.listHolidays).toHaveBeenCalledWith(auth, "2026", "IN");
  });
});
