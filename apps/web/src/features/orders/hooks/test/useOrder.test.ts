import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  useQuery: vi.fn((config: unknown) => config),
}));

vi.mock("@tanstack/react-query", () => query);
vi.mock("../../query-options", () => ({
  orderDetailQuery: (id: string) => ({
    queryKey: ["order", id],
    queryFn: vi.fn(),
  }),
}));

import { useOrder } from "@/features/orders/hooks/useOrder";

describe("useOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the detail query with the supplied order id", () => {
    expect(useOrder("o1")).toMatchObject({ queryKey: ["order", "o1"] });
    expect(query.useQuery).toHaveBeenCalledTimes(1);
  });
});
