vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  type H = ((ctx: any) => unknown) | undefined;
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: H }> = [];
    constructor(_o: unknown = {}) {}
    use(_p: unknown) {
      return this;
    }
    get(path: string, handler?: (ctx: any) => unknown) {
      this.routes.push({ method: "GET", path, handler });
      return this;
    }
    post(path: string, handler?: (ctx: any) => unknown) {
      this.routes.push({ method: "POST", path, handler });
      return this;
    }
    patch(path: string, handler?: (ctx: any) => unknown) {
      this.routes.push({ method: "PATCH", path, handler });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
import { beforeEach, describe, expect, it, vi } from "vitest";
const ctl = vi.hoisted(() => ({
  list: vi.fn(),
  search: vi.fn(),
  getById: vi.fn(),
  explain: vi.fn(),
  getInventoryImpact: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  fireTicket: vi.fn(),
  voidItem: vi.fn(),
  compItem: vi.fn(),
  refireItem: vi.fn(),
  refillItem: vi.fn(),
  transferTable: vi.fn(),
  mergeOrders: vi.fn(),
}));
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../order.controller", () => ({ orderController: ctl }));
import { ordersRouter } from "../order.route";
const find = (m: string, p: string) =>
  (ordersRouter as any).routes.find((r: any) => r.method === m && r.path === p)
    .handler;
beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(ctl)) fn.mockResolvedValue({ ok: true });
});
describe("orders routes", () => {
  it("executes every documented order handler", async () => {
    const auth = { tenantId: "t1" };
    const params = { id: "o1", itemId: "i1" };
    const body: any = {
      status: "PAID",
      reason: "why",
      cancellationReasonId: "c1",
      approvalToken: "a",
      items: [],
      alsoCompOriginal: false,
      newTableId: "t2",
      targetOrderId: "o2",
    };
    await find("GET", "/api/orders/")({ auth, query: { status: "OPEN" } });
    expect(ctl.list).toHaveBeenCalledWith(auth, { status: "OPEN" });
    await find(
      "GET",
      "/api/orders/search",
    )({
      auth,
      query: { q: "12345678", limit: 8 },
    });
    expect(ctl.search).toHaveBeenCalledWith(auth, { q: "12345678", limit: 8 });
    await find("GET", "/api/orders/:id")({ auth, params });
    await find("GET", "/api/orders/:id/explain")({ auth, params });
    await find("GET", "/api/orders/:id/inventory-impact")({ auth, params });
    const set: any = {};
    await find("POST", "/api/orders/")({ auth, body, set });
    expect(set.status).toBe(201);
    await find("PATCH", "/api/orders/:id/status")({ auth, params, body });
    expect(ctl.updateStatus).toHaveBeenCalledWith(
      auth,
      "o1",
      "PAID",
      "why",
      "c1",
    );
    await find("POST", "/api/orders/:id/items")({ auth, params, body });
    await find(
      "POST",
      "/api/orders/:id/items/:itemId/void",
    )({ auth, params, body });
    expect(ctl.voidItem).toHaveBeenCalledWith(
      auth,
      "o1",
      "i1",
      "why",
      "c1",
      "a",
    );
    await find(
      "POST",
      "/api/orders/:id/items/:itemId/comp",
    )({ auth, params, body });
    await find(
      "POST",
      "/api/orders/:id/items/:itemId/refire",
    )({ auth, params, body });
    await find(
      "POST",
      "/api/orders/:id/items/:itemId/refill",
    )({ auth, params });
    await find(
      "POST",
      "/api/orders/:id/transfer-table",
    )({ auth, params, body });
    await find("POST", "/api/orders/:id/merge")({ auth, params, body });
    expect(ctl.mergeOrders).toHaveBeenCalledWith(auth, "o1", "o2");
  });
});
