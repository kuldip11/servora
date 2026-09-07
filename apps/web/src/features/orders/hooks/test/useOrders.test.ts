import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  useQuery: vi.fn((config: unknown) => config),
}));

vi.mock("@tanstack/react-query", () => query);
vi.mock("../../query-options", () => ({
  ordersListQuery: (filters: unknown) => ({
    queryKey: ["orders", filters],
    queryFn: vi.fn(),
  }),
}));

import { useOrders } from "@/features/orders/hooks/useOrders";

describe("useOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the list query with the supplied filters", () => {
    expect(useOrders({ status: "OPEN" })).toMatchObject({
      queryKey: ["orders", { status: "OPEN" }],
    });
    expect(query.useQuery).toHaveBeenCalledTimes(1);
  });
});
