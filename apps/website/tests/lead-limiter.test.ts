import { describe, expect, it } from "vitest";
import { createLeadLimiter } from "@/lib/lead-limiter";

describe("lead limiter", () => {
  it("expires clients that never return and bounds capacity without resetting active budgets", () => {
    let now = 0;
    const limiter = createLeadLimiter(100, 2, 2, () => now);
    expect(limiter.isRateLimited("a")).toBe(false);
    expect(limiter.isRateLimited("b")).toBe(false);
    expect(limiter.isRateLimited("c")).toBe(true);
    expect(limiter.size).toBe(2);
    expect(limiter.isRateLimited("a")).toBe(false);
    expect(limiter.isRateLimited("a")).toBe(true);
    now = 100;
    expect(limiter.isRateLimited("c")).toBe(false);
    expect(limiter.size).toBe(1);
    expect(limiter.isRateLimited("a")).toBe(false);
  });
  it("uses a sliding window without letting rejected attempts extend retention", () => {
    let now = 0;
    const limiter = createLeadLimiter(100, 2, 10, () => now);
    limiter.isRateLimited("a");
    now = 50;
    limiter.isRateLimited("a");
    expect(limiter.isRateLimited("a")).toBe(true);
    now = 100;
    expect(limiter.isRateLimited("a")).toBe(false);
    expect(limiter.isRateLimited("a")).toBe(true);
    now = 200;
    expect(limiter.isRateLimited("b")).toBe(false);
    expect(limiter.size).toBe(1);
  });
});
