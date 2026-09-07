import { afterEach, describe, expect, it, vi } from "vitest";
import { Elysia } from "elysia";
import { rootLogger } from "@/core/logger";
import { metrics } from "@/core/observability/metrics";
import { requestLoggingPlugin } from "@/core/observability/request-logging";

describe("requestLoggingPlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records and logs successful requests with the default status", async () => {
    const info = vi.spyOn(rootLogger, "info").mockImplementation(() => undefined);
    const observe = vi
      .spyOn(metrics, "observeDuration")
      .mockImplementation(() => undefined);
    vi.spyOn(Date, "now").mockReturnValueOnce(100).mockReturnValue(125);

    const app = new Elysia()
      .use(requestLoggingPlugin())
      .get("/health", () => ({ ok: true }));

    const response = await app.handle(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    expect(observe).toHaveBeenCalledWith("servora_api_request_duration_ms", 25, {
      method: "GET",
      status: "200",
    });
    expect(info).toHaveBeenCalledWith(
      "request.completed",
      expect.objectContaining({
        method: "GET",
        path: "/health",
        statusCode: 200,
        durationMs: 25,
      }),
    );
    expect(info.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it("uses an explicitly assigned response status", async () => {
    const info = vi.spyOn(rootLogger, "info").mockImplementation(() => undefined);
    const observe = vi
      .spyOn(metrics, "observeDuration")
      .mockImplementation(() => undefined);

    const app = new Elysia()
      .use(requestLoggingPlugin())
      .post("/created", ({ set }) => {
        set.status = 201;
        return { ok: true };
      });

    const response = await app.handle(
      new Request("http://localhost/created", { method: "POST" }),
    );
    expect(response.status).toBe(201);
    expect(observe).toHaveBeenCalledWith(
      "servora_api_request_duration_ms",
      expect.any(Number),
      { method: "POST", status: "201" },
    );
    expect(info).toHaveBeenCalledWith(
      "request.completed",
      expect.objectContaining({
        method: "POST",
        path: "/created",
        statusCode: 201,
      }),
    );
  });
});
