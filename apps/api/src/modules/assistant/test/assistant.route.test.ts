import { beforeEach, describe, expect, it, vi } from "vitest";
import { Elysia } from "elysia";
const mock = vi.hoisted(() => ({ capabilities: vi.fn(), ask: vi.fn() }));
vi.mock("../assistant.service", () => ({ assistantService: mock }));
import { assistantRouter } from "../assistant.route";
import { handleApiError } from "@/core/errors";
import { reply } from "../assistant.responses";
const app = () =>
  new Elysia()
    .onError((context) => handleApiError(context))
    .use(assistantRouter);
const post = (body: unknown, token = "token") =>
  app().handle(
    new Request("http://localhost/api/customer/assistant/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Customer-Session": token } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  mock.capabilities.mockResolvedValue({ enabled: false });
  mock.ask.mockResolvedValue(reply("en", "NO_MATCH", true));
});
describe("assistant HTTP contract", () => {
  it("requires customer authentication", async () => {
    expect((await post({ message: "veg", language: "en" }, "")).status).toBe(
      401,
    );
    expect(mock.ask).not.toHaveBeenCalled();
  });
  it("rejects oversized messages and unsupported languages", async () => {
    for (const body of [
      { message: "x".repeat(601), language: "en" },
      { message: "veg", language: "fr" },
    ])
      expect((await post(body)).status).toBe(400);
    expect(mock.ask).not.toHaveBeenCalled();
  });
  it("discards scope overrides instead of trusting them", async () => {
    const result = await post({
      message: "veg",
      language: "en",
      tenantId: "foreign",
      branchId: "foreign",
    });
    expect(result.status).toBe(200);
    expect(mock.ask).toHaveBeenCalledWith(
      "token",
      { message: "veg", language: "en" },
      expect.any(AbortSignal),
    );
  });
  it("returns a no-store envelope and passes cancellation", async () => {
    const result = await post({ message: "veg", language: "en" });
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(
      ((await result.json()) as { data: { outcome: string } }).data.outcome,
    ).toBe("NO_MATCH");
    expect(mock.ask).toHaveBeenCalledWith(
      "token",
      { message: "veg", language: "en" },
      expect.any(AbortSignal),
    );
  });
});
