const signal = new AbortController().signal;

import { describe, expect, it, vi } from "vitest";

const dashboard = vi.hoisted(() => vi.fn());
vi.mock("../services/analytics.service", () => ({
  analyticsService: { dashboard },
}));

vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { dashboardStatsQuery } from "@/features/analytics/query-options";

describe("dashboardStatsQuery", () => {
  it("returns the dashboard query definition with the default interval", () => {
    const query = dashboardStatsQuery();

    expect(query.queryKey).toEqual([
      "analytics",
      "branch-context",
      "fr-1",
      "br-1",
      "dashboard",
    ]);
    query.queryFn?.({ signal } as never);
    expect(dashboard).toHaveBeenCalledWith(signal);
    expect(query.refetchInterval).toBe(30_000);
  });

  it("allows disabling or changing the refetch interval", () => {
    expect(dashboardStatsQuery(false).refetchInterval).toBe(false);
    expect(dashboardStatsQuery(5_000).refetchInterval).toBe(5_000);
  });
});
