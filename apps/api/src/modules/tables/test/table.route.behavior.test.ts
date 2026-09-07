import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  regenerateQr: vi.fn(),
  updateStatus: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class F {
    routes: any[] = [];
    use() {
      return this;
    }
    get(p: string, h: Function, o?: unknown) {
      this.routes.push({ method: "GET", path: p, handler: h, options: o });
      return this;
    }
    post(p: string, h: Function, o?: unknown) {
      this.routes.push({ method: "POST", path: p, handler: h, options: o });
      return this;
    }
    patch(p: string, h: Function, o?: unknown) {
      this.routes.push({ method: "PATCH", path: p, handler: h, options: o });
      return this;
    }
    delete(p: string, h: Function, o?: unknown) {
      this.routes.push({ method: "DELETE", path: p, handler: h, options: o });
      return this;
    }
  }
  return { ...actual, Elysia: F };
});
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../table.controller", () => ({ tableController: m }));
import { tablesRouter } from "../table.route";
const r = (method: string, path: string) =>
  (tablesRouter as any).routes.find(
    (x: any) => x.method === method && x.path === path,
  );
describe("table route callbacks", () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockResolvedValue("ok");
  });
  it("executes all handlers", async () => {
    const auth = {};
    await r("GET", "/api/tables/").handler({ auth });
    const set: any = {};
    await r("POST", "/api/tables/").handler({ auth, body: { name: "T" }, set });
    expect(set.status).toBe(201);
    await r("POST", "/api/tables/:id/qr/regenerate").handler({
      auth,
      params: { id: "t1" },
    });
    await r("PATCH", "/api/tables/:id/status").handler({
      auth,
      params: { id: "t1" },
      body: { status: "AVAILABLE" },
    });
    await r("PATCH", "/api/tables/:id").handler({
      auth,
      params: { id: "t1" },
      body: { name: "N" },
    });
    await r("DELETE", "/api/tables/:id").handler({
      auth,
      params: { id: "t1" },
    });
    expect((tablesRouter as any).routes).toHaveLength(6);
  });
});
