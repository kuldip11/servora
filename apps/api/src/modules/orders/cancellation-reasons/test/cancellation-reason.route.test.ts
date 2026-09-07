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
import { describe, expect, it, vi } from "vitest";
const svc = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../cancellation-reason.service", () => ({
  cancellationReasonService: svc,
}));
import { cancellationReasonsRouter } from "../cancellation-reason.route";
describe("cancellation reason routes", () => {
  it("executes list/create/update handlers", async () => {
    const routes = (cancellationReasonsRouter as any).routes;
    const auth = { tenantId: "t1" };
    svc.list.mockResolvedValue([]);
    svc.create.mockResolvedValue({ id: "r1" });
    svc.update.mockResolvedValue({ id: "r1" });
    const find = (m: string, p: string) =>
      routes.find((r: any) => r.method === m && r.path === p).handler;
    await find("GET", "/")({ auth, query: { activeOnly: "true" } });
    expect(svc.list).toHaveBeenCalledWith(auth, true);
    await find("GET", "/")({ auth, query: {} });
    expect(svc.list).toHaveBeenLastCalledWith(auth, false);
    await find("POST", "/")({ auth, body: { label: "Reason" } });
    expect(svc.create).toHaveBeenCalledWith(auth, "Reason");
    await find(
      "PATCH",
      "/:id",
    )({ auth, params: { id: "r1" }, body: { isActive: false } });
    expect(svc.update).toHaveBeenCalledWith(auth, "r1", { isActive: false });
  });
});
