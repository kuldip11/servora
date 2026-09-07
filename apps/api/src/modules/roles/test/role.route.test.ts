import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    use() {
      return this;
    }
    get(path: string, handler: Function, options?: unknown) {
      this.routes.push({ method: "GET", path, handler, options });
      return this;
    }
    post(path: string, handler: Function, options?: unknown) {
      this.routes.push({ method: "POST", path, handler, options });
      return this;
    }
    patch(path: string, handler: Function, options?: unknown) {
      this.routes.push({ method: "PATCH", path, handler, options });
      return this;
    }
    delete(path: string, handler: Function, options?: unknown) {
      this.routes.push({ method: "DELETE", path, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../role.controller", () => ({ roleController: mocks }));
import { rolesRouter } from "../role.route";
const route = (method: string, path: string) =>
  (rolesRouter as any).routes.find(
    (r: any) => r.method === method && r.path === path,
  );
describe("role routes coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue("list");
    mocks.create.mockResolvedValue("create");
    mocks.update.mockResolvedValue("update");
    mocks.archive.mockResolvedValue("archive");
  });
  it("registers and executes all handlers", async () => {
    const auth = { tenantId: "t1" };
    expect(await route("GET", "/api/roles/").handler({ auth })).toBe("list");
    const set: any = {};
    expect(
      await route("POST", "/api/roles/").handler({
        auth,
        body: { name: "X", scope: "TENANT" },
        set,
      }),
    ).toBe("create");
    expect(set.status).toBe(201);
    expect(
      await route("PATCH", "/api/roles/:id").handler({
        auth,
        params: { id: "r1" },
        body: { name: "Y" },
      }),
    ).toBe("update");
    expect(
      await route("DELETE", "/api/roles/:id").handler({
        auth,
        params: { id: "r1" },
      }),
    ).toBe("archive");
    expect((rolesRouter as any).routes).toHaveLength(4);
  });
});
