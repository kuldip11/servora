import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCustomerOrder: vi.fn(),
}));

vi.mock("@/api", () => ({
  createCustomerSession: vi.fn(),
  getCustomerMenu: vi.fn(),
  getCustomerOrder: mocks.getCustomerOrder,
}));

import { customerOrderQuery } from "./customer.queries";
import { customerKeys } from "./customer.keys";

describe("customer query definitions", () => {
  it("keeps polling as fallback and forwards the TanStack signal", async () => {
    mocks.getCustomerOrder.mockResolvedValue({ id: "order-1" });
    const fallback = customerOrderQuery(
      "scope-a",
      "session-a",
      "order-1",
      false,
    );
    const signal = new AbortController().signal;

    await expect(fallback.queryFn({ signal })).resolves.toEqual({
      id: "order-1",
    });
    expect(fallback.queryKey).toEqual(
      customerKeys.order("scope-a", "session-a", "order-1"),
    );
    expect(fallback.refetchInterval).toBe(15_000);
    expect(mocks.getCustomerOrder).toHaveBeenCalledWith(
      "session-a",
      "order-1",
      signal,
    );

    expect(
      customerOrderQuery("scope-a", "session-a", "order-1", true)
        .refetchInterval,
    ).toBe(false);
  });
});
