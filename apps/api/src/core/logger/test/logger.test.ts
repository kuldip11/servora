import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Logger, createLogger } from "@/core/logger/logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured info logs with context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    createLogger({ requestId: "r1", tenantId: "t1" }, "orders").info(
      "created",
      { amount: 10 },
    );
    const payload = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(payload).toMatchObject({
      level: "info",
      requestId: "r1",
      tenantId: "t1",
      module: "orders",
      message: "created",
      meta: { amount: 10 },
    });
  });

  it("redacts sensitive nested metadata", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createLogger({}, "auth").warn("credentials", {
      password: "secret",
      nested: { accessToken: "abc", ok: true },
    });
    const payload = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(payload.meta).toEqual({
      password: "[REDACTED]",
      nested: { accessToken: "[REDACTED]", ok: true },
    });
  });

  it("only emits debug logs in development mode", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    new Logger({}, "test", false).debug("hidden");
    expect(spy).not.toHaveBeenCalled();
    new Logger({}, "test", true).debug("shown");
    expect(spy).toHaveBeenCalledOnce();
  });

  it("logs errors with error metadata and supports child context", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new Logger({ tenantId: "t1" }, "app", true);
    const child = logger.child({ branchId: "b1", module: "billing" });
    child.error("failed", new Error("boom"), { token: "secret" });
    const payload = JSON.parse(errorSpy.mock.calls[0]![0] as string);
    expect(payload).toMatchObject({
      level: "error",
      tenantId: "t1",
      branchId: "b1",
      module: "billing",
      message: "failed",
    });
    expect(payload.meta.token).toBe("[REDACTED]");
    expect(child).toBeInstanceOf(Logger);
  });

  it("sanitizes arrays and primitive values inside metadata", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    createLogger({}, "test").info("meta", {
      values: [null, 0, false, "ok", { apiKey: "secret", count: 2 }],
    });
    const payload = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(payload.meta.values).toEqual([
      null,
      0,
      false,
      "ok",
      { apiKey: "[REDACTED]", count: 2 },
    ]);
  });

  it("omits stack traces in production-style errors and keeps the parent module by default", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = new Logger({ userId: "u1" }, "orders", false);
    const child = logger.child({ requestId: "r1" });
    child.error("failed", new Error("boom"));
    const payload = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(payload).toMatchObject({
      module: "orders",
      userId: "u1",
      requestId: "r1",
      meta: { error: { name: "Error", message: "boom" } },
    });
    expect(payload.meta.error.stack).toBeUndefined();
  });
});
