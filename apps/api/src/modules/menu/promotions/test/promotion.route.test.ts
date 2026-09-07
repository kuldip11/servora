import { describe, expect, it, vi } from "vitest";
const { controller } = vi.hoisted(() => ({ controller: { preview: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), stats: vi.fn() } }));
vi.mock("../promotion.controller", () => ({ promotionController: controller }));
vi.mock("@/core/auth", async () => { const { Elysia } = await import("elysia"); return { requireAuthPlugin: () => new Elysia().derive(() => ({ auth: { tenantId: "t1" } })) }; });
import { promotionsRouter } from "../promotion.route";
const uuid = "11111111-1111-4111-8111-111111111111";
describe("promotion routes", () => {
  it("executes all registered handlers", async () => {
    for (const fn of Object.values(controller)) (fn as any).mockResolvedValue({ ok: true });
    const req = (path: string, init?: RequestInit) => promotionsRouter.handle(new Request(`http://localhost${path}`, init));
    expect((await req("/api/menu/promotions/")).status).toBe(200);
    expect((await req("/api/menu/promotions/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Promo", ruleType: "PERCENTAGE", scope: "ORDER", value: 10 }) })).status).toBe(200);
    expect((await req("/api/menu/promotions/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ promotion: { name: "Promo", ruleType: "PERCENTAGE", scope: "ORDER", value: 10 }, items: [{ menuItemId: uuid, quantity: 1 }] }) })).status).toBe(200);
    expect((await req(`/api/menu/promotions/${uuid}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Updated" }) })).status).toBe(200);
    expect((await req(`/api/menu/promotions/${uuid}`, { method: "DELETE" })).status).toBe(200);
    expect((await req(`/api/menu/promotions/${uuid}/stats`)).status).toBe(200);
  });
});
