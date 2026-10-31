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
vi.mock("../branch.controller", () => ({
  branchController: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  },
}));
import { branchesRouter } from "@/modules/branches/branch.route";
describe("branch routes", () => {
  it("registers authenticated CRUD endpoints under /api/branches", () => {
    const routes = (branchesRouter as any).routes;
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/api/branches/" }),
        expect.objectContaining({
          method: "GET",
          path: "/api/branches/:id/takeaway-qr",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/api/branches/:id/takeaway-qr/regenerate",
        }),
        expect.objectContaining({ method: "POST", path: "/api/branches/" }),
        expect.objectContaining({ method: "PATCH", path: "/api/branches/:id" }),
        expect.objectContaining({
          method: "DELETE",
          path: "/api/branches/:id",
        }),
      ]),
    );
  });
});
