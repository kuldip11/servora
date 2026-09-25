const signal = new AbortController().signal;

import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), getTakeawayQr: vi.fn() }));
vi.mock("../services/tables.service", () => ({
  tablesService: { list: mocks.list, getTakeawayQr: mocks.getTakeawayQr },
}));
vi.mock("../../../store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));

import { takeawayQrQuery, tablesQuery } from "@/features/tables/query-options";

describe("tablesQuery", () => {
  it("binds the table key to the table service", () => {
    const query = tablesQuery();
    expect(query.queryKey).toEqual([
      "tables",
      "branch-context",
      "fr-1",
      "br-1",
      "list",
    ]);
    query.queryFn?.({ signal } as never);
    expect(mocks.list).toHaveBeenCalledWith(signal);
  });

  it("binds takeaway QR to the branch-scoped service call", async () => {
    const query = takeawayQrQuery("br-1");
    expect(query.queryKey).toEqual([
      "tables",
      "branch-context",
      "fr-1",
      "br-1",
      "takeaway-qr",
      "br-1",
    ]);
    await query.queryFn?.({ signal } as never);
    expect(mocks.getTakeawayQr).toHaveBeenCalledWith("br-1", signal);
  });
});
