import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  forRole: vi.fn(),
  setForRole: vi.fn(),
}));

vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{
      method: string;
      path: string;
      handler: Function;
      options?: unknown;
    }> = [];
    use() {
      return this;
    }
    get(path: string, handler: Function, options?: unknown) {
      this.routes.push({ method: "GET", path, handler, options });
      return this;
    }
    put(path: string, handler: Function, options?: unknown) {
      this.routes.push({ method: "PUT", path, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../permission.controller", () => ({ permissionController: mocks }));

import { permissionsRouter } from "../permission.route";

const route = (method: string, path: string) =>
  (permissionsRouter as any).routes.find(
    (r: any) => r.method === method && r.path === path,
  );

describe("permission routes coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue("list");
    mocks.forRole.mockResolvedValue("role");
    mocks.setForRole.mockResolvedValue("set");
  });

  it("registers and executes every route", async () => {
    expect(
      (permissionsRouter as any).routes.map((r: any) => [r.method, r.path]),
    ).toEqual([
      ["GET", "/api/permissions/"],
      ["GET", "/api/roles/:id/permissions"],
      ["PUT", "/api/roles/:id/permissions"],
    ]);
    const auth = { tenantId: "t1" };
    await expect(
      route("GET", "/api/permissions/").handler({ auth }),
    ).resolves.toBe("list");
    await expect(
      route("GET", "/api/roles/:id/permissions").handler({
        auth,
        params: { id: "r1" },
      }),
    ).resolves.toBe("role");
    await expect(
      route("PUT", "/api/roles/:id/permissions").handler({
        auth,
        params: { id: "r1" },
        body: { permissionIds: ["p1"] },
      }),
    ).resolves.toBe("set");
    expect(mocks.forRole).toHaveBeenCalledWith(auth, "r1");
    expect(mocks.setForRole).toHaveBeenCalledWith(auth, "r1", ["p1"]);
    expect(route("GET", "/api/roles/:id/permissions").options).toBeTruthy();
    expect(route("PUT", "/api/roles/:id/permissions").options).toBeTruthy();
  });
});
