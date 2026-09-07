import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  listTenants: vi.fn(),
  listLoyaltyTiers: vi.fn(),
  createLoyaltyTier: vi.fn(),
  updateLoyaltyTier: vi.fn(),
  deleteLoyaltyTier: vi.fn(),
  listMenus: vi.fn(),
  createMenu: vi.fn(),
  updateMenu: vi.fn(),
  deleteMenu: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class F {
    routes: any[] = [];
    constructor(public options?: unknown) {}
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
vi.mock("../organization.controller", () => ({ organizationController: m }));
import { organizationsRouter } from "../organization.route";
const r = (method: string, path: string) =>
  (organizationsRouter as any).routes.find(
    (x: any) => x.method === method && x.path === path,
  );
describe("organization routes coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of Object.values(m)) fn.mockResolvedValue("ok");
  });
  it("executes all route handlers", async () => {
    const auth = { tenantId: "t1" };
    const set: any = {};
    await r("GET", "/").handler({ auth });
    await r("POST", "/").handler({ auth, body: { name: "X" }, set });
    expect(set.status).toBe(201);
    await r("GET", "/:id/tenants").handler({ auth, params: { id: "o1" } });
    await r("GET", "/:id/loyalty-tiers").handler({
      auth,
      params: { id: "o1" },
    });
    await r("POST", "/:id/loyalty-tiers").handler({
      auth,
      params: { id: "o1" },
      body: { name: "G", discountPercent: 10 },
    });
    await r("PATCH", "/:id/loyalty-tiers/:tierId").handler({
      auth,
      params: { id: "o1", tierId: "tier1" },
      body: { name: "N" },
    });
    await r("DELETE", "/:id/loyalty-tiers/:tierId").handler({
      auth,
      params: { id: "o1", tierId: "tier1" },
    });
    await r("GET", "/:id/menus").handler({ auth, params: { id: "o1" } });
    await r("POST", "/:id/menus").handler({
      auth,
      params: { id: "o1" },
      body: { name: "M", items: [] },
    });
    await r("PATCH", "/:id/menus/:menuId").handler({
      auth,
      params: { id: "o1", menuId: "m1" },
      body: { name: "M" },
    });
    await r("DELETE", "/:id/menus/:menuId").handler({
      auth,
      params: { id: "o1", menuId: "m1" },
    });
    await r("PATCH", "/:id").handler({
      auth,
      params: { id: "o1" },
      body: { name: "N" },
    });
    await r("DELETE", "/:id").handler({ auth, params: { id: "o1" } });
    expect((organizationsRouter as any).routes).toHaveLength(13);
  });
});
