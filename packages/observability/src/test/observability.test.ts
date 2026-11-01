import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveFrontendTelemetryEndpoint,
  startFrontendTelemetry,
  type FrontendTelemetryEvent,
} from "../index";

class MockPerformanceObserver {
  static callbacks: Array<
    (list: { getEntries: () => PerformanceEntry[] }) => void
  > = [];

  constructor(
    callback: (list: { getEntries: () => PerformanceEntry[] }) => void,
  ) {
    MockPerformanceObserver.callbacks.push(callback);
  }

  observe() {}
  disconnect() {}
}

describe("resolveFrontendTelemetryEndpoint", () => {
  it("normalizes API base URLs and honors an explicit override", () => {
    expect(resolveFrontendTelemetryEndpoint("http://localhost:3000")).toBe(
      "http://localhost:3000/api/telemetry/frontend",
    );
    expect(resolveFrontendTelemetryEndpoint("/api")).toBe(
      "/api/telemetry/frontend",
    );
    expect(
      resolveFrontendTelemetryEndpoint(
        "/api",
        "https://collector.example/vitals",
      ),
    ).toBe("https://collector.example/vitals");
  });
});

describe("startFrontendTelemetry", () => {
  beforeEach(() => {
    MockPerformanceObserver.callbacks = [];
    vi.stubGlobal("PerformanceObserver", MockPerformanceObserver);
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports runtime errors and can be disposed", () => {
    const events: FrontendTelemetryEvent[] = [];
    const dispose = startFrontendTelemetry({
      app: "test-app",
      onEvent: (event) => events.push(event),
    });

    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    expect(
      events.some(
        (event) => event.type === "error" && event.message === "boom",
      ),
    ).toBe(true);

    dispose();
    const count = events.length;
    window.dispatchEvent(new ErrorEvent("error", { message: "after" }));
    expect(events).toHaveLength(count);
  });

  it("honors sampling", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const events: FrontendTelemetryEvent[] = [];
    const dispose = startFrontendTelemetry({
      app: "test-app",
      sampleRate: 0.25,
      onEvent: (event) => events.push(event),
    });

    window.dispatchEvent(new ErrorEvent("error", { message: "ignored" }));
    expect(events).toHaveLength(0);
    dispose();
  });
});
