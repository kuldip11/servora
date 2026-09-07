import { describe, expect, it } from "vitest";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { metrics } from "@/core/observability/metrics";
import { metricsRouter } from "@/core/observability/metrics.route";

describe("metricsRouter", () => {
  it.each([
    undefined,
    "Basic abc",
    "Bearer wrong",
    `Bearer ${env.METRICS_TOKEN}x`,
  ])("hides metrics for invalid authorization %s", async (authorization) => {
    const app = new Elysia().use(metricsRouter);
    const response = await app.handle(
      new Request("http://localhost/metrics", {
        headers: authorization ? { authorization } : undefined,
      }),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("returns Prometheus text for the exact bearer token", async () => {
    metrics.increment("coverage_route_counter");
    const app = new Elysia().use(metricsRouter);
    const response = await app.handle(
      new Request("http://localhost/metrics", {
        headers: { authorization: `Bearer ${env.METRICS_TOKEN}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("coverage_route_counter 1");
  });
});
