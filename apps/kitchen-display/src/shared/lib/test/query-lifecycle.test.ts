import { describe, expect, it, vi } from "vitest";
import {
  clearKitchenQueries,
  replaceKitchenContext,
} from "@/shared/lib/query-lifecycle";

describe("Kitchen query lifecycle", () => {
  it("cancels active reads before clearing cached server state", async () => {
    const calls: string[] = [];
    const queryClient = {
      cancelQueries: vi.fn(async () => {
        calls.push("cancel");
      }),
      clear: vi.fn(() => calls.push("clear")),
    };

    await clearKitchenQueries(queryClient as never);

    expect(calls).toEqual(["cancel", "clear"]);
  });

  it("clears the old cache before persisting a replacement context", async () => {
    sessionStorage.setItem("kds_tenant", "old-tenant");
    sessionStorage.setItem("kds_branch", "old-branch");
    const observations: string[] = [];
    const queryClient = {
      cancelQueries: vi.fn(async () => observations.push("cancel")),
      clear: vi.fn(() =>
        observations.push(
          `clear:${sessionStorage.getItem("kds_tenant")}:${sessionStorage.getItem("kds_branch")}`,
        ),
      ),
    };

    await replaceKitchenContext(
      queryClient as never,
      "new-tenant",
      "new-branch",
    );

    expect(observations).toEqual(["cancel", "clear:old-tenant:old-branch"]);
    expect(sessionStorage.getItem("kds_tenant")).toBe("new-tenant");
    expect(sessionStorage.getItem("kds_branch")).toBe("new-branch");
  });
});
