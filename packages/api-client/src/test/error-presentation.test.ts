import { describe, expect, it } from "vitest";
import { classifyApiErrorForUi } from "../error-presentation";
import type { ApiClientError } from "../api-error";

const error = (overrides: Partial<ApiClientError>): ApiClientError => ({
  code: "REQUEST_FAILED",
  message: "Request failed",
  retryable: false,
  ...overrides,
});

describe("classifyApiErrorForUi", () => {
  it.each([
    [401, "authentication"],
    [403, "permission"],
    [404, "not-found"],
    [409, "conflict"],
    [429, "rate-limit"],
    [500, "server"],
  ] as const)("maps %s to %s", (status, kind) => {
    expect(classifyApiErrorForUi(error({ status })).kind).toBe(kind);
  });

  it("classifies backend field validation", () => {
    expect(
      classifyApiErrorForUi(
        error({
          status: 400,
          code: "VALIDATION_FAILED",
          fieldErrors: { name: ["Required"] },
        }),
      ).kind,
    ).toBe("validation");
  });

  it("only exposes request references for support-relevant failures", () => {
    expect(
      classifyApiErrorForUi(error({ status: 500, requestId: "req-500" }))
        .requestReference,
    ).toBe("req-500");
    expect(
      classifyApiErrorForUi(error({ status: 403, requestId: "req-403" }))
        .requestReference,
    ).toBeUndefined();
  });
});
