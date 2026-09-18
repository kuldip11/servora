import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  ValidationError,
} from "../app-error";
import {
  createApiErrorResponse,
  publicCodeForAppError,
  serializeAppError,
} from "../error-response";

describe("frontend error response contract", () => {
  it("uses domain reason codes when available", () => {
    const error = new ConflictError("This table already has an open order.", {
      reason: "TABLE_OCCUPIED",
      sql: "should-stay-in-logs",
    });
    expect(serializeAppError(error, "req-1")).toEqual({
      success: false,
      error: {
        code: "TABLE_OCCUPIED",
        message: "This table already has an open order.",
        retryable: false,
        requestId: "req-1",
      },
    });
  });

  it("creates resource-specific not-found codes without exposing ids", () => {
    const error = new NotFoundError("Order", "secret-id");
    expect(publicCodeForAppError(error)).toBe("ORDER_NOT_FOUND");
    const response = serializeAppError(error, "req-2");
    expect(response.error.message).toBe("Order was not found.");
    expect(JSON.stringify(response)).not.toContain("secret-id");
  });

  it("converts validation field metadata into fieldErrors", () => {
    expect(serializeAppError(new ValidationError("Name is required.", { field: "name" }), "req-3")).toEqual({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Name is required.",
        fieldErrors: { name: ["Name is required."] },
        retryable: false,
        requestId: "req-3",
      },
    });
  });

  it("marks only transient statuses retryable", () => {
    expect(serializeAppError(new ForbiddenError(), "req-4").error.retryable).toBe(false);
    expect(serializeAppError(new InternalError(), "req-5").error.retryable).toBe(true);
    expect(createApiErrorResponse({ code: "RATE_LIMITED", message: "Try later", statusCode: 429, requestId: "req-6" }).error.retryable).toBe(true);
  });
});
