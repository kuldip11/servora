import { afterEach, describe, expect, it, vi } from "vitest";
import { reportAssistantFailure } from "../assistant.diagnostics";
import { AssistantProtocolError } from "../assistant.errors";
import { metrics } from "@/core/observability/metrics";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assistant failure diagnostics", () => {
  it("records the dependency and safe status without leaking raw provider data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const increment = vi.spyOn(metrics, "increment");
    const error = Object.assign(new Error("customer text and secret payload"), {
      statusCode: 401,
      responseBody: "sensitive response",
      headers: { authorization: "secret-key" },
    });
    reportAssistantFailure(
      "model",
      { tenantId: "tenant", branchId: "branch" },
      error,
    );
    const log = JSON.parse(warn.mock.calls[0]![0]);
    expect(log.meta).toEqual({
      tenantId: "tenant",
      branchId: "branch",
      stage: "model",
      upstreamStatus: 401,
    });
    expect(JSON.stringify(log)).not.toMatch(
      /customer text|secret|sensitive response/,
    );
    expect(increment).toHaveBeenCalledWith("servora_assistant_failures_total", {
      stage: "model",
    });
  });
  it.each([null, "raw secret", { statusCode: "secret" }, { statusCode: 999 }])(
    "omits untrusted status metadata: %j",
    (error) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      reportAssistantFailure(
        "menu",
        { tenantId: "tenant", branchId: "branch" },
        error,
      );
      expect(JSON.parse(warn.mock.calls[0]![0]).meta).toEqual({
        tenantId: "tenant",
        branchId: "branch",
        stage: "menu",
      });
    },
  );
  it("records only the controlled protocol reason", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reportAssistantFailure(
      "protocol",
      { tenantId: "tenant", branchId: "branch" },
      new AssistantProtocolError("duplicate_tools"),
    );
    expect(JSON.parse(warn.mock.calls[0]![0]).meta.reason).toBe(
      "duplicate_tools",
    );
  });
});
