import { describe, expect, it, vi } from "vitest";
const { controller } = vi.hoisted(() => ({ controller: { list: vi.fn(), get: vi.fn(), createFromCategory: vi.fn(), apply: vi.fn(), delete: vi.fn() } }));
vi.mock("../templates.controller", () => ({ templatesController: controller }));
vi.mock("@/core/auth", async () => { const { Elysia } = await import("elysia"); return { requireAuthPlugin: () => new Elysia().derive(() => ({ auth: { tenantId: "t1" } })) }; });
import { menuTemplatesRouter } from "../templates.route";
describe("templates route coverage", () => {
  it("executes all handlers", async () => {
    for (const fn of Object.values(controller)) (fn as any).mockResolvedValue({ ok: true });
    const req = (path: string, init?: RequestInit) => menuTemplatesRouter.handle(new Request(`http://localhost${path}`, init));
    expect((await req("/api/menu/templates/")).status).toBe(200);
    expect((await req("/api/menu/templates/t1")).status).toBe(200);
    expect((await req("/api/menu/templates/from-category/c1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Copy", description: "D" }) })).status).toBe(201);
    expect((await req("/api/menu/templates/t1/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branchId: "b1", categoryName: "New" }) })).status).toBe(201);
    expect((await req("/api/menu/templates/t1", { method: "DELETE" })).status).toBe(200);
    expect(controller.createFromCategory).toHaveBeenCalled();
    expect(controller.apply).toHaveBeenCalled();
  });
});
