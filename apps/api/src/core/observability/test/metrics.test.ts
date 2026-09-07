import { describe, expect, it } from "vitest";
import { metrics } from "@/core/observability/metrics";

describe("metrics", () => {
  it("renders counters with sorted, filtered, and escaped labels", () => {
    const name = "coverage_counter_total";
    metrics.increment(name, {
      z: 'quote"slash\\',
      ignored: undefined,
      a: true,
    });
    metrics.increment(name, { z: 'quote"slash\\', a: true }, 2);

    const output = metrics.renderPrometheus();
    expect(output).toContain(`# TYPE ${name} counter`);
    expect(output).toContain(`${name}{a="true",z="quote\\"slash\\\\"} 3`);
    expect(output).not.toContain("ignored=");
  });

  it("renders unlabeled gauges and updates their current value", () => {
    const name = "coverage_gauge";
    metrics.setGauge(name, 1);
    metrics.setGauge(name, 7);

    const output = metrics.renderPrometheus();
    expect(output).toContain(`# TYPE ${name} gauge`);
    expect(output).toContain(`${name} 7`);
  });

  it("tracks duration count, sum, and maximum by label set", () => {
    const name = "coverage_duration_ms";
    metrics.observeDuration(name, 10, { method: "GET" });
    metrics.observeDuration(name, 4, { method: "GET" });

    const output = metrics.renderPrometheus();
    expect(output).toContain(`# TYPE ${name} summary`);
    expect(output).toContain(`${name}_count{method="GET"} 2`);
    expect(output).toContain(`${name}_sum{method="GET"} 14`);
    expect(output).toContain(`${name}_max{method="GET"} 10`);
    expect(output.endsWith("\n")).toBe(true);
  });
});
