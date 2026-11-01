import { describe, expect, it } from "vitest";
import { ApiClientErrorException } from "@pos/api-client";
import { queryClient } from "@/shared/lib/query-client";

describe("query client", () =>
  it("uses kitchen defaults", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    const retry = defaults.queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;
    const retryable = new ApiClientErrorException({
      code: "SERVICE_UNAVAILABLE",
      message: "temporary",
      retryable: true,
      status: 503,
    });
    const nonRetryable = new ApiClientErrorException({
      code: "VALIDATION_FAILED",
      message: "invalid",
      retryable: false,
      status: 400,
    });
    expect(retry(0, retryable)).toBe(true);
    expect(retry(1, retryable)).toBe(true);
    expect(retry(2, retryable)).toBe(false);
    expect(retry(0, nonRetryable)).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  }));
