const signal = new AbortController().signal;

import { describe, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("../services/branches.service", () => ({
  branchesService: { list },
}));

vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { branchesQuery } from "@/features/branches/query-options";

describe("branchesQuery", () => {
  it("binds the branch-list query key and service", () => {
    const query = branchesQuery();
    expect(query.queryKey).toEqual(["branches", "franchise", "fr-1", "list"]);
    query.queryFn?.({ signal } as never);
    expect(list).toHaveBeenCalledWith(signal);
    expect(query.staleTime).toBe(300_000);
  });
});
