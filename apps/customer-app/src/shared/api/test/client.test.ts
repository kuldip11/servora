import { beforeEach, describe, expect, it, vi } from "vitest";
import { toApiClientError } from "@pos/api-client";
describe("request", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  it("merges headers and returns data", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: { x: 1 } }),
    });
    vi.stubGlobal("fetch", fetch);
    const { request } = await import("../client");
    await expect(
      request("/x", { headers: { A: "b" } }, "tok"),
    ).resolves.toEqual({ x: 1 });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/x"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Customer-Session": "tok",
          A: "b",
        }),
      }),
    );
  });
  it("handles no token/no init, API errors, HTTP errors and invalid JSON", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { request } = await import("../client");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: 1 }),
    });
    await expect(request("/ok")).resolves.toBe(1);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: false, message: "bad" }),
    });
    await expect(request("/bad")).rejects.toThrow("bad");
    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    });
    await expect(request("/http")).rejects.toThrow(
      "Customer API request failed",
    );
    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error("json")),
    });
    await expect(request("/json")).rejects.toThrow(
      "Customer API request failed",
    );
  });
  it("normalizes network failures as retryable API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const { request } = await import("../client");

    const error = await request("/network").catch((caught) => caught);
    expect(toApiClientError(error)).toMatchObject({
      code: "NETWORK_ERROR",
      retryable: true,
    });
  });

  it("normalizes timeouts as retryable and caller aborts as non-retryable", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (_url: RequestInfo | URL, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const { CUSTOMER_API_REQUEST_TIMEOUT_MS, request } =
      await import("../client");

    const timeoutPromise = request("/slow").catch((caught) => caught);
    await vi.advanceTimersByTimeAsync(CUSTOMER_API_REQUEST_TIMEOUT_MS);
    expect(toApiClientError(await timeoutPromise)).toMatchObject({
      code: "REQUEST_TIMEOUT",
      retryable: true,
    });

    const controller = new AbortController();
    const abortedPromise = request("/abort", {
      signal: controller.signal,
    }).catch((caught) => caught);
    controller.abort();
    expect(toApiClientError(await abortedPromise)).toMatchObject({
      code: "REQUEST_ABORTED",
      retryable: false,
    });
    vi.useRealTimers();
  });
});
