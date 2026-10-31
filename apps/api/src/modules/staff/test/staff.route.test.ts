vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    name: string;
    constructor(options: any = {}) {
      this.name = options.name ?? "";
    }
    use(_plugin: any) {
      return this;
    }
    get(path: string) {
      this.routes.push({ method: "GET", path });
      return this;
    }
    post(path: string) {
      this.routes.push({ method: "POST", path });
      return this;
    }
    put(path: string) {
      this.routes.push({ method: "PUT", path });
      return this;
    }
    patch(path: string) {
      this.routes.push({ method: "PATCH", path });
      return this;
    }
    delete(path: string) {
      this.routes.push({ method: "DELETE", path });
      return this;
    }
    ws(path: string) {
      this.routes.push({ method: "WS", path });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
import { describe, expect, it, vi } from "vitest";
vi.mock("../staff.controller", () => ({
  staffController: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listRoles: vi.fn(),
  },
}));
import { staffRouter } from "@/modules/staff/staff.route";
import { rolesRouter } from "@/modules/roles/role.route";
describe("staff routes", () => {
  it("registers authenticated staff CRUD routes", () => {
    const routes = (staffRouter as any).routes;
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/api/staff/" }),
        expect.objectContaining({ method: "POST", path: "/api/staff/" }),
        expect.objectContaining({ method: "PATCH", path: "/api/staff/:id" }),
        expect.objectContaining({ method: "DELETE", path: "/api/staff/:id" }),
      ]),
    );
  });
  it("registers the authenticated roles lookup route", () => {
    expect((rolesRouter as any).routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/api/roles/" }),
      ]),
    );
  });
});
