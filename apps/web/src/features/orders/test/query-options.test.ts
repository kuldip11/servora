const signal = new AbortController().signal;

import { describe, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
const detail = vi.hoisted(() => vi.fn());
vi.mock("../services/orders.service", () => ({
  ordersService: { list, detail },
}));

vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import {
  orderDetailQuery,
  ordersListQuery,
} from "@/features/orders/query-options";

describe("order query definitions", () => {
  it("binds list filters into the query key and service call", () => {
    const filters = { status: "OPEN" as const };
    const query = ordersListQuery(filters);
    expect(query.queryKey).toEqual([
      "orders",
      "list",
      "branch-context",
      "fr-1",
      "br-1",
      filters,
    ]);
    expect(query.queryFn).toEqual(expect.any(Function));
  });

  it("binds an order id into the detail key", async () => {
    const query = orderDetailQuery("order-1");
    expect(query.queryKey).toEqual([
      "orders",
      "detail",
      "branch-context",
      "fr-1",
      "br-1",
      "order-1",
    ]);
    expect(query.queryFn).toEqual(expect.any(Function));
    await query.queryFn?.({ signal } as never);
    expect(detail).toHaveBeenCalledWith("order-1", signal);
  });
});
