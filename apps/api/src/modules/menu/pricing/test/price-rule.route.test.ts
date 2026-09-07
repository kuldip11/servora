import { describe, expect, it, vi } from "vitest";
const { controller } = vi.hoisted(() => ({ controller: { list: vi.fn(), create: vi.fn(), createHappyHour: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock("../price-rule.controller", () => ({ priceRuleController: controller }));
vi.mock("@/core/auth", async () => { const { Elysia } = await import("elysia"); return { requireAuthPlugin: () => new Elysia().derive(() => ({ auth: { tenantId: "t1" } })) }; });
import { priceRulesRouter } from "../price-rule.route";
describe("price rule route", () => {
  it("executes all handlers", async () => {
    controller.list.mockResolvedValue({ ok: "list" }); controller.create.mockResolvedValue({ ok: "create" }); controller.createHappyHour.mockResolvedValue({ ok: "hh" }); controller.update.mockResolvedValue({ ok: "update" }); controller.remove.mockResolvedValue({ ok: "remove" });
    const req = (path: string, init?: RequestInit) => priceRulesRouter.handle(new Request(`http://localhost${path}`, init));
    expect((await req("/api/menu/price-rules/?menuItemId=i1")).status).toBe(200); expect((await req("/api/menu/price-rules/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ price: 10 }) })).status).toBe(200);
    expect((await req("/api/menu/price-rules/happy-hour", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ percentOff: 20, startTime: "17:00", endTime: "19:00" }) })).status).toBe(200); expect((await req("/api/menu/price-rules/r1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ priority: 2 }) })).status).toBe(200); expect((await req("/api/menu/price-rules/r1", { method: "DELETE" })).status).toBe(200);
    expect(controller.list).toHaveBeenCalled(); expect(controller.remove).toHaveBeenCalled();
  });
});
