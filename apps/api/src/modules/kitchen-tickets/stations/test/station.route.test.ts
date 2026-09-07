import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  listRoutes: vi.fn(), setRoute: vi.fn(), removeRoute: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<any> = [];
    use() { return this; }
    get(path: string, handler?: Function, options?: unknown) { this.routes.push({ method: "GET", path, handler, options }); return this; }
    post(path: string, handler?: Function, options?: unknown) { this.routes.push({ method: "POST", path, handler, options }); return this; }
    patch(path: string, handler?: Function, options?: unknown) { this.routes.push({ method: "PATCH", path, handler, options }); return this; }
    put(path: string, handler?: Function, options?: unknown) { this.routes.push({ method: "PUT", path, handler, options }); return this; }
    delete(path: string, handler?: Function, options?: unknown) { this.routes.push({ method: "DELETE", path, handler, options }); return this; }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../station.service", () => ({ stationService: mocks }));
import { kitchenStationsRouter } from "@/modules/kitchen-tickets/stations/station.route";
const route = (method: string, path: string) => (kitchenStationsRouter as any).routes.find((r: any) => r.method === method && r.path === path);
const auth = { tenantId: "t1" } as any;

describe("kitchen station routes", () => {
  beforeEach(() => { vi.clearAllMocks(); Object.values(mocks).forEach((fn) => fn.mockResolvedValue({ id: "x" })); });
  it("registers all station endpoints", () => {
    expect((kitchenStationsRouter as any).routes.map((r: any) => [r.method, r.path])).toEqual([
      ["GET", "/"], ["POST", "/"], ["PATCH", "/:id"], ["DELETE", "/:id"],
      ["GET", "/routes/:id"], ["PUT", "/routes/:id"], ["DELETE", "/routes/:id"],
    ]);
  });
  it("executes all handlers", async () => {
    await route("GET", "/").handler({ auth, query: { branchId: "b2" } });
    await route("POST", "/").handler({ auth, body: { name: "Grill" } });
    await route("PATCH", "/:id").handler({ auth, params: { id: "s1" }, body: { name: "Hot" } });
    await route("DELETE", "/:id").handler({ auth, params: { id: "s1" } });
    await route("GET", "/routes/:id").handler({ auth, params: { id: "i1" } });
    await route("PUT", "/routes/:id").handler({ auth, params: { id: "i1" }, body: { stationId: "s1", modifierOptionId: null } });
    await route("DELETE", "/routes/:id").handler({ auth, params: { id: "i1" }, query: { modifierOptionId: "m1" } });
    expect(mocks.list).toHaveBeenCalledWith(auth, "b2");
    expect(mocks.create).toHaveBeenCalledWith(auth, { name: "Grill" });
    expect(mocks.update).toHaveBeenCalledWith(auth, "s1", { name: "Hot" });
    expect(mocks.remove).toHaveBeenCalledWith(auth, "s1");
    expect(mocks.listRoutes).toHaveBeenCalledWith(auth, "i1");
    expect(mocks.setRoute).toHaveBeenCalledWith(auth, "i1", { stationId: "s1", modifierOptionId: null });
    expect(mocks.removeRoute).toHaveBeenCalledWith(auth, "i1", "m1");
  });
});
