import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import {
  clearWaiterQueries,
  replaceWaiterContext,
} from "@/shared/lib/query-lifecycle";

describe("waiter query lifecycle", () => {
  beforeEach(() => localStorage.clear());

  it("cancels active work before clearing cached server state", async () => {
    const events: string[] = [];
    const queryClient = {
      cancelQueries: vi.fn(async () => {
        events.push("cancel");
      }),
      clear: vi.fn(() => events.push("clear")),
    } as unknown as QueryClient;

    await clearWaiterQueries(queryClient);

    expect(events).toEqual(["cancel", "clear"]);
  });

  it("clears old queries before persisting a replacement context", async () => {
    localStorage.setItem("waiter_tenant", "old-tenant");
    localStorage.setItem("waiter_branch", "old-branch");
    const observations: string[] = [];
    const queryClient = {
      cancelQueries: vi.fn(async () => {
        observations.push(localStorage.getItem("waiter_tenant")!);
      }),
      clear: vi.fn(() => {
        observations.push(localStorage.getItem("waiter_branch")!);
      }),
    } as unknown as QueryClient;

    await replaceWaiterContext(queryClient, "new-tenant", "new-branch");

    expect(observations).toEqual(["old-tenant", "old-branch"]);
    expect(localStorage.getItem("waiter_tenant")).toBe("new-tenant");
    expect(localStorage.getItem("waiter_branch")).toBe("new-branch");
  });
});
