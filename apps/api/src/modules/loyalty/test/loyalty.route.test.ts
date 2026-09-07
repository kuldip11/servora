import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  listTiers: vi.fn(),
  createTier: vi.fn(),
  updateTier: vi.fn(),
  removeTier: vi.fn(),
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
}));
vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    use() {
      return this;
    }
    get(path: string, handler?: Function, options?: unknown) {
      this.routes.push({ method: "GET", path, handler, options });
      return this;
    }
    post(path: string, handler?: Function, options?: unknown) {
      this.routes.push({ method: "POST", path, handler, options });
      return this;
    }
    patch(path: string, handler?: Function, options?: unknown) {
      this.routes.push({ method: "PATCH", path, handler, options });
      return this;
    }
    delete(path: string, handler?: Function, options?: unknown) {
      this.routes.push({ method: "DELETE", path, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../loyalty.service", () => ({ loyaltyService: mocks }));
import { loyaltyRouter } from "@/modules/loyalty/loyalty.route";
const route = (m: string, p: string) =>
  (loyaltyRouter as any).routes.find(
    (r: any) => r.method === m && r.path === p,
  );
const auth = { tenantId: "t1" } as any;
describe("loyalty routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mocks).forEach((fn) => fn.mockResolvedValue({ id: "x" }));
    mocks.listTiers.mockResolvedValue([]);
    mocks.listCustomers.mockResolvedValue([]);
  });
  it("registers all endpoints", () => {
    expect(
      (loyaltyRouter as any).routes.map((r: any) => [r.method, r.path]),
    ).toEqual([
      ["GET", "/tiers"],
      ["POST", "/tiers"],
      ["PATCH", "/tiers/:id"],
      ["DELETE", "/tiers/:id"],
      ["GET", "/customers"],
      ["POST", "/customers"],
      ["PATCH", "/customers/:id"],
    ]);
  });
  it("executes all handlers", async () => {
    await route("GET", "/tiers").handler({ auth });
    await route("POST", "/tiers").handler({
      auth,
      body: { name: "Gold", discountPercent: 10 },
    });
    await route("PATCH", "/tiers/:id").handler({
      auth,
      params: { id: "tier" },
      body: { name: "G" },
    });
    await route("DELETE", "/tiers/:id").handler({
      auth,
      params: { id: "tier" },
    });
    await route("GET", "/customers").handler({ auth });
    await route("POST", "/customers").handler({ auth, body: { name: "C" } });
    await route("PATCH", "/customers/:id").handler({
      auth,
      params: { id: "c1" },
      body: { name: "C2" },
    });
    expect(mocks.createTier).toHaveBeenCalledWith(auth, {
      name: "Gold",
      discountPercent: 10,
    });
    expect(mocks.updateTier).toHaveBeenCalledWith(auth, "tier", { name: "G" });
    expect(mocks.removeTier).toHaveBeenCalledWith(auth, "tier");
    expect(mocks.createCustomer).toHaveBeenCalledWith(auth, { name: "C" });
    expect(mocks.updateCustomer).toHaveBeenCalledWith(auth, "c1", {
      name: "C2",
    });
  });
});
