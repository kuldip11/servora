import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: Function | undefined; options: unknown }> = [];
    prefix: string;
    constructor(options: { prefix?: string } = {}) {
      this.prefix = options.prefix ?? "";
    }
    use() { return this; }
    get(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "GET", path: `${this.prefix}${path}`, handler, options });
      return this;
    }
    post(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "POST", path: `${this.prefix}${path}`, handler, options });
      return this;
    }
    patch(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "PATCH", path: `${this.prefix}${path}`, handler, options });
      return this;
    }
    delete(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "DELETE", path: `${this.prefix}${path}`, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("./customer-group.service", () => ({
  customerGroupService: {
    list: mocks.list,
    findById: mocks.findById,
    create: mocks.create,
    update: mocks.update,
    remove: mocks.remove,
  },
}));

import { customerGroupsRouter } from "./customer-group.route";

const auth = { tenantId: "t1" };
const route = (method: string, path: string) =>
  (customerGroupsRouter as any).routes.find(
    (entry: any) => entry.method === method && entry.path === path,
  );

describe("customerGroupsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([{ id: "g1" }]);
    mocks.findById.mockResolvedValue({ id: "g1" });
    mocks.create.mockResolvedValue({ id: "g1" });
    mocks.update.mockResolvedValue({ id: "g1", name: "VIP 2" });
    mocks.remove.mockResolvedValue(undefined);
  });

  it("registers all customer-group endpoints", () => {
    expect((customerGroupsRouter as any).routes.map((entry: any) => [entry.method, entry.path])).toEqual([
      ["GET", "/api/customer-groups/"],
      ["GET", "/api/customer-groups/:id"],
      ["POST", "/api/customer-groups/"],
      ["PATCH", "/api/customer-groups/:id"],
      ["DELETE", "/api/customer-groups/:id"],
    ]);
  });

  it("executes list/find/create/update/delete handlers and wraps responses", async () => {
    await expect(route("GET", "/api/customer-groups/").handler({ auth })).resolves.toMatchObject({ success: true, data: [{ id: "g1" }] });
    await expect(route("GET", "/api/customer-groups/:id").handler({ auth, params: { id: "g1" } })).resolves.toMatchObject({ success: true, data: { id: "g1" } });
    await expect(route("POST", "/api/customer-groups/").handler({ auth, body: { name: "VIP" } })).resolves.toMatchObject({ success: true, data: { id: "g1" } });
    await expect(route("PATCH", "/api/customer-groups/:id").handler({ auth, params: { id: "g1" }, body: { name: "VIP 2" } })).resolves.toMatchObject({ success: true, data: { name: "VIP 2" } });
    await expect(route("DELETE", "/api/customer-groups/:id").handler({ auth, params: { id: "g1" } })).resolves.toMatchObject({ success: true, data: null });

    expect(mocks.list).toHaveBeenCalledWith(auth);
    expect(mocks.findById).toHaveBeenCalledWith(auth, "g1");
    expect(mocks.create).toHaveBeenCalledWith(auth, { name: "VIP" });
    expect(mocks.update).toHaveBeenCalledWith(auth, "g1", { name: "VIP 2" });
    expect(mocks.remove).toHaveBeenCalledWith(auth, "g1");
  });
});
