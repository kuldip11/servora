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
vi.mock("../table.controller", () => ({
  tableController: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
  },
}));
import { tablesRouter } from "@/modules/tables/table.route";
describe("table routes", () => {
  it("registers authenticated table CRUD/status endpoints", () => {
    const routes = (tablesRouter as any).routes;
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/api/tables/" }),
        expect.objectContaining({ method: "POST", path: "/api/tables/" }),
        expect.objectContaining({
          method: "PATCH",
          path: "/api/tables/:id/status",
        }),
        expect.objectContaining({ method: "PATCH", path: "/api/tables/:id" }),
        expect.objectContaining({ method: "DELETE", path: "/api/tables/:id" }),
      ]),
    );
  });
});
