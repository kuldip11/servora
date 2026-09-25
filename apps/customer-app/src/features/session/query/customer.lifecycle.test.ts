import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  return {
    calls,
    clearPersistedSession: vi.fn(() => calls.push("clear-session")),
    clearPersistedOrderId: vi.fn(() => calls.push("clear-order")),
  };
});

vi.mock("@/features/cart/persistence", () => ({
  clearPersistedSession: mocks.clearPersistedSession,
  clearPersistedOrderId: mocks.clearPersistedOrderId,
}));

import { expireCustomerSession } from "./customer.lifecycle";
import { customerKeys } from "./customer.keys";

describe("customer session query lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
  });

  it("cancels and removes the old session cache before clearing context", async () => {
    const queryClient = {
      cancelQueries: vi.fn(async () => mocks.calls.push("cancel")),
      removeQueries: vi.fn(() => mocks.calls.push("remove")),
    };

    await expireCustomerSession(queryClient as never, "scope-a", "session-a");

    expect(mocks.calls).toEqual([
      "cancel",
      "remove",
      "clear-session",
      "clear-order",
    ]);
    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: customerKeys.session("scope-a", "session-a"),
    });
    expect(queryClient.removeQueries).toHaveBeenCalledWith({
      queryKey: customerKeys.session("scope-a", "session-a"),
    });
  });
});
