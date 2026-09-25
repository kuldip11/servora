import { describe, expect, it, vi } from "vitest";

vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { billingKeys } from "@/features/billing/query-keys";

describe("billingKeys", () => {
  it("scopes order bills to the active branch context", () => {
    expect(billingKeys.order("o1")).toEqual([
      "billing",
      "branch-context",
      "fr-1",
      "br-1",
      "order",
      "o1",
    ]);
  });
});
