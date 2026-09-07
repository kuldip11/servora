import { beforeEach, describe, expect, it, vi } from "vitest";
const c = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    prefix: string;
    constructor(o: any = {}) {
      this.prefix = o.prefix ?? "";
    }
    use() {
      return this;
    }
    get(p: string, h?: Function, o?: unknown) {
      this.routes.push({
        method: "GET",
        path: `${this.prefix}${p}`,
        handler: h,
        options: o,
      });
      return this;
    }
    post(p: string, h?: Function, o?: unknown) {
      this.routes.push({
        method: "POST",
        path: `${this.prefix}${p}`,
        handler: h,
        options: o,
      });
      return this;
    }
    patch(p: string, h?: Function, o?: unknown) {
      this.routes.push({
        method: "PATCH",
        path: `${this.prefix}${p}`,
        handler: h,
        options: o,
      });
      return this;
    }
    delete(p: string, h?: Function, o?: unknown) {
      this.routes.push({
        method: "DELETE",
        path: `${this.prefix}${p}`,
        handler: h,
        options: o,
      });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../category.controller", () => ({ categoryController: c }));
import { menuCategoriesRouter } from "@/modules/menu/categories/category.route";
const auth = { tenantId: "t1" } as any;
const route = (m: string, p: string) =>
  (menuCategoriesRouter as any).routes.find(
    (r: any) => r.method === m && r.path === p,
  );
describe("category routes coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(c).forEach((fn: any) =>
      fn.mockResolvedValue({ success: true }),
    );
  });
  it("registers and executes all routes including 201 status", async () => {
    expect((menuCategoriesRouter as any).routes).toHaveLength(4);
    await route("GET", "/api/menu/categories/").handler({ auth });
    const set: any = {};
    await route("POST", "/api/menu/categories/").handler({
      auth,
      body: { name: "D" },
      set,
    });
    expect(set.status).toBe(201);
    await route("PATCH", "/api/menu/categories/:id").handler({
      auth,
      params: { id: "c1" },
      body: { name: "B" },
    });
    await route("DELETE", "/api/menu/categories/:id").handler({
      auth,
      params: { id: "c1" },
    });
    expect(c.deactivate).toHaveBeenCalledWith(auth, "c1");
  });
});
