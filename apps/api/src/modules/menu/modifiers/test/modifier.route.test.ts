vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    constructor(_o: any = {}) {}
    use(_p: any) {
      return this;
    }
    get(path: string, handler?: any) {
      this.routes.push({ method: "GET", path, handler });
      return this;
    }
    post(path: string, handler?: any) {
      this.routes.push({ method: "POST", path, handler });
      return this;
    }
    patch(path: string, handler?: any) {
      this.routes.push({ method: "PATCH", path, handler });
      return this;
    }
    delete(path: string, handler?: any) {
      this.routes.push({ method: "DELETE", path, handler });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
const m = vi.hoisted(() => ({
  listGroups: vi.fn().mockResolvedValue({}),
  createGroup: vi.fn().mockResolvedValue({}),
  updateGroup: vi.fn().mockResolvedValue({}),
  deleteGroup: vi.fn().mockResolvedValue({}),
  setOptionAvailability: vi.fn().mockResolvedValue({}),
  listTags: vi.fn().mockResolvedValue({}),
  createTag: vi.fn().mockResolvedValue({}),
  deleteTag: vi.fn().mockResolvedValue({}),
  listAllergens: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../modifier.controller", () => ({ modifierController: m }));
import { describe, expect, it, vi } from "vitest";
import { menuModifiersRouter } from "../modifier.route";
describe("modifier routes coverage", () => {
  it("executes every handler", async () => {
    const rs = (menuModifiersRouter as any).routes;
    const r = (method: string, path: string) =>
      rs.find((x: any) => x.method === method && x.path === path);
    const auth = { tenantId: "t1" };
    let set: any = {};
    await r("GET", "/modifier-groups").handler({ auth });
    await r("POST", "/modifier-groups").handler({
      auth,
      body: { name: "G" },
      set,
    });
    expect(set.status).toBe(201);
    await r("PATCH", "/modifier-groups/:id").handler({
      auth,
      params: { id: "g1" },
      body: { name: "N" },
    });
    await r("DELETE", "/modifier-groups/:id").handler({
      auth,
      params: { id: "g1" },
    });
    await r("PATCH", "/modifier-options/:id/availability").handler({
      auth,
      params: { id: "o1" },
      body: { isAvailable: true },
    });
    await r("GET", "/tags").handler({ auth });
    set = {};
    await r("POST", "/tags").handler({ auth, body: { name: "T" }, set });
    expect(set.status).toBe(201);
    await r("DELETE", "/tags/:id").handler({ auth, params: { id: "t1" } });
    await r("GET", "/allergens").handler({ auth });
    expect(m.listAllergens).toHaveBeenCalledWith(auth);
  });
});
