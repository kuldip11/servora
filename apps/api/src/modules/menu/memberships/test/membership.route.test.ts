import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  listForItem: vi.fn(),
  assign: vi.fn(),
  remove: vi.fn(),
  listItems: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    prefix: string;
    constructor(options: { prefix?: string } = {}) {
      this.prefix = options.prefix ?? "";
    }
    use() {
      return this;
    }
    get(path: string, handler?: Function, options?: unknown) {
      this.routes.push({
        method: "GET",
        path: `${this.prefix}${path}`,
        handler,
        options,
      });
      return this;
    }
    post(path: string, handler?: Function, options?: unknown) {
      this.routes.push({
        method: "POST",
        path: `${this.prefix}${path}`,
        handler,
        options,
      });
      return this;
    }
    delete(path: string, handler?: Function, options?: unknown) {
      this.routes.push({
        method: "DELETE",
        path: `${this.prefix}${path}`,
        handler,
        options,
      });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../membership.service", () => ({ membershipService: mocks }));
import { menuMembershipsRouter } from "@/modules/menu/memberships/membership.route";
const auth = { tenantId: "t1" } as any;
const route = (method: string, path: string) =>
  (menuMembershipsRouter as any).routes.find(
    (r: any) => r.method === method && r.path === path,
  );
describe("menuMembershipsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listForItem.mockResolvedValue([]);
    mocks.assign.mockResolvedValue({ id: "m1" });
    mocks.remove.mockResolvedValue(undefined);
    mocks.listItems.mockResolvedValue([]);
  });
  it("registers all membership endpoints", () => {
    expect(
      (menuMembershipsRouter as any).routes.map((r: any) => [r.method, r.path]),
    ).toEqual([
      ["GET", "/api/menu/items/:id/memberships"],
      ["POST", "/api/menu/items/:id/memberships"],
      ["DELETE", "/api/menu/items/:id/memberships/:menuId"],
      ["GET", "/api/menu/menus/:id/items"],
    ]);
  });
  it("executes every handler", async () => {
    await expect(
      route("GET", "/api/menu/items/:id/memberships").handler({
        auth,
        params: { id: "i1" },
      }),
    ).resolves.toMatchObject({ success: true, data: [] });
    await expect(
      route("POST", "/api/menu/items/:id/memberships").handler({
        auth,
        params: { id: "i1" },
        body: { menuId: "m1", categoryId: "c1" },
      }),
    ).resolves.toMatchObject({ success: true, data: { id: "m1" } });
    await expect(
      route("DELETE", "/api/menu/items/:id/memberships/:menuId").handler({
        auth,
        params: { id: "i1", menuId: "m1" },
      }),
    ).resolves.toMatchObject({ success: true, data: null });
    await expect(
      route("GET", "/api/menu/menus/:id/items").handler({
        auth,
        params: { id: "m1" },
      }),
    ).resolves.toMatchObject({ success: true, data: [] });
    expect(mocks.listForItem).toHaveBeenCalledWith(auth, "i1");
    expect(mocks.assign).toHaveBeenCalledWith(auth, "i1", {
      menuId: "m1",
      categoryId: "c1",
    });
    expect(mocks.remove).toHaveBeenCalledWith(auth, "i1", "m1");
    expect(mocks.listItems).toHaveBeenCalledWith(auth, "m1");
  });
});
