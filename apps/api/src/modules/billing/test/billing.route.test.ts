import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  createRefund: vi.fn(),
  getBill: vi.fn(),
  getOrderBills: vi.fn(),
  splitOrder: vi.fn(),
  splitOrderByItems: vi.fn(),
  setItemSeatShares: vi.fn(),
  splitOrderBySeat: vi.fn(),
}));

vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{
      method: string;
      path: string;
      handler: Function | undefined;
      options: unknown;
    }> = [];
    use() {
      return this;
    }
    get(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "GET", path, handler, options });
      return this;
    }
    post(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "POST", path, handler, options });
      return this;
    }
    put(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "PUT", path, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../billing.controller", () => ({ billingController: mocks }));

import { billingRouter } from "@/modules/billing/billing.route";

const route = (method: string, path: string) =>
  (billingRouter as any).routes.find(
    (entry: any) => entry.method === method && entry.path === path,
  );

const auth = { tenantId: "t1" };

describe("billing routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of Object.values(mocks)) fn.mockResolvedValue({ ok: true });
  });

  it("registers every billing endpoint", () => {
    expect(
      (billingRouter as any).routes.map((entry: any) => [
        entry.method,
        entry.path,
      ]),
    ).toEqual([
      ["POST", "/api/payments"],
      ["POST", "/api/refunds"],
      ["GET", "/api/bills/:id"],
      ["GET", "/api/orders/:id/bills"],
      ["POST", "/api/orders/:id/bills/split"],
      ["POST", "/api/orders/:id/bills/split-items"],
      ["PUT", "/api/orders/:id/items/:itemId/seat-shares"],
      ["POST", "/api/orders/:id/bills/split-seat"],
    ]);
  });

  it("executes every handler and applies created statuses", async () => {
    const set1: any = {};
    await route("POST", "/api/payments").handler({
      auth,
      body: { orderId: "o1" },
      set: set1,
    });
    expect(set1.status).toBe(201);

    const set2: any = {};
    await route("POST", "/api/refunds").handler({
      auth,
      body: { paymentId: "p1" },
      set: set2,
    });
    expect(set2.status).toBe(201);

    await route("GET", "/api/bills/:id").handler({
      auth,
      params: { id: "b1" },
    });
    await route("GET", "/api/orders/:id/bills").handler({
      auth,
      params: { id: "o1" },
    });

    const set3: any = {};
    await route("POST", "/api/orders/:id/bills/split").handler({
      auth,
      params: { id: "o1" },
      body: { ways: 2 },
      set: set3,
    });
    expect(set3.status).toBe(201);

    const allocations = [{ orderItemIds: ["oi1"] }];
    const set4: any = {};
    await route("POST", "/api/orders/:id/bills/split-items").handler({
      auth,
      params: { id: "o1" },
      body: { allocations },
      set: set4,
    });
    expect(set4.status).toBe(201);

    const shares = [{ seatLabel: "S1", shareRatio: 1 }];
    await route("PUT", "/api/orders/:id/items/:itemId/seat-shares").handler({
      auth,
      params: { id: "o1", itemId: "oi1" },
      body: { shares },
    });

    const set5: any = {};
    await route("POST", "/api/orders/:id/bills/split-seat").handler({
      auth,
      params: { id: "o1" },
      body: { sharedItemStrategy: "EVEN_SPLIT" },
      set: set5,
    });
    expect(set5.status).toBe(201);

    expect(mocks.createPayment).toHaveBeenCalledWith(auth, { orderId: "o1" });
    expect(mocks.createRefund).toHaveBeenCalledWith(auth, { paymentId: "p1" });
    expect(mocks.getBill).toHaveBeenCalledWith(auth, "b1");
    expect(mocks.getOrderBills).toHaveBeenCalledWith(auth, "o1");
    expect(mocks.splitOrder).toHaveBeenCalledWith(auth, "o1", 2);
    expect(mocks.splitOrderByItems).toHaveBeenCalledWith(
      auth,
      "o1",
      allocations,
    );
    expect(mocks.setItemSeatShares).toHaveBeenCalledWith(
      auth,
      "o1",
      "oi1",
      shares,
    );
    expect(mocks.splitOrderBySeat).toHaveBeenCalledWith(
      auth,
      "o1",
      "EVEN_SPLIT",
    );
  });
});
