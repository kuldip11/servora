import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ eval: vi.fn() }));
vi.mock("@/lib/redis", () => ({ redis: mock }));
import { reserveAssistantTurn } from "../assistant.limits";
beforeEach(() => {
  vi.clearAllMocks();
});
describe("shared assistant budgets", () => {
  it("reserves session-minute, session-lifetime and tenant-day budgets atomically", async () => {
    mock.eval.mockResolvedValue(1);
    const expires = new Date(Date.now() + 60000);
    await reserveAssistantTurn("tenant-A", "session-A", expires);
    expect(mock.eval).toHaveBeenCalledWith(
      expect.any(String),
      3,
      expect.stringContaining("session-A:minute:"),
      "assistant:session:session-A:turns",
      expect.stringContaining("tenant-A:day:"),
      6,
      30,
      200,
      61,
      expect.any(Number),
      86401,
    );
  });
  it("rejects exhausted budgets", async () => {
    mock.eval.mockResolvedValue(0);
    await expect(
      reserveAssistantTurn("t", "s", new Date()),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
  it("fails closed when Redis is unavailable", async () => {
    mock.eval.mockRejectedValue(new Error("offline"));
    await expect(
      reserveAssistantTurn("t", "s", new Date()),
    ).rejects.toMatchObject({ statusCode: 503 });
  });
});
