import { describe, expect, it, vi } from "vitest";
import { Elysia } from "elysia";
import { metrics } from "@/core/observability/metrics";
import { frontendTelemetryRouter } from "@/core/observability/frontend-telemetry.route";

describe("frontendTelemetryRouter", () => {
  it("records Web Vitals without storing route or message as metric labels", async () => {
    const observe = vi.spyOn(metrics, "observeDuration");
    const app = new Elysia().use(frontendTelemetryRouter);

    const response = await app.handle(
      new Request("http://localhost/api/telemetry/frontend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "web-vital",
          app: "servora-web",
          timestamp: new Date().toISOString(),
          route: "/orders/123",
          metric: { name: "LCP", value: 1234, rating: "good" },
        }),
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(observe).toHaveBeenCalledWith(
      "servora_frontend_metric_value",
      1234,
      {
        app: "servora-web",
        metric: "LCP",
        rating: "good",
      },
    );
  });

  it("counts runtime failures using bounded labels", async () => {
    const increment = vi.spyOn(metrics, "increment");
    const app = new Elysia().use(frontendTelemetryRouter);

    const response = await app.handle(
      new Request("http://localhost/api/telemetry/frontend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "error",
          app: "servora-kitchen",
          timestamp: new Date().toISOString(),
          message: "Example runtime failure",
        }),
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(increment).toHaveBeenCalledWith(
      "servora_frontend_runtime_errors_total",
      {
        app: "servora-kitchen",
        type: "error",
      },
    );
  });
});
