import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  DomainRuleError,
  ErrorCode,
  ForbiddenError,
  InternalError,
  MissingBranchError,
  CustomerSessionRequiredError,
  TooManyRequestsError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from "@/core/errors/app-error";

describe("AppError hierarchy", () => {
  it("preserves code, status, details and serializable response shape", () => {
    const error = new ValidationError("Bad input", { field: "name" });
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.statusCode).toBe(400);
    expect(error.toJSON()).toMatchObject({
      success: false,
      code: ErrorCode.VALIDATION_FAILED,
      message: "Bad input",
      details: { field: "name" },
    });
    expect(AppError.isAppError(error)).toBe(true);
  });

  it("maps specialized errors to their stable codes and HTTP statuses", () => {
    const cases = [
      [new UnauthorizedError(), ErrorCode.UNAUTHORIZED, 401],
      [new TooManyRequestsError(), ErrorCode.RATE_LIMITED, 429],
      [
        new CustomerSessionRequiredError(),
        ErrorCode.CUSTOMER_SESSION_REQUIRED,
        401,
      ],
      [new ForbiddenError(), ErrorCode.FORBIDDEN, 403],
      [new NotFoundError("Order", "1"), ErrorCode.NOT_FOUND, 404],
      [new ConflictError("Conflict"), ErrorCode.CONFLICT, 409],
      [new DomainRuleError("Rule"), ErrorCode.DOMAIN_RULE_VIOLATION, 422],
      [new MissingBranchError(), ErrorCode.MISSING_BRANCH, 400],
      [new InternalError(), ErrorCode.INTERNAL_ERROR, 500],
      [new ServiceUnavailableError(), ErrorCode.SERVICE_UNAVAILABLE, 503],
    ] as const;
    for (const [error, code, status] of cases) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(code);
      expect(error.statusCode).toBe(status);
    }
  });

  it("formats not-found messages with and without ids", () => {
    expect(new NotFoundError("Tenant").message).toBe("Tenant not found");
    expect(new NotFoundError("Tenant", "abc").message).toBe(
      "Tenant with id abc not found",
    );
  });

  it("preserves cause on internal errors", () => {
    const cause = new Error("db failed");
    expect(new InternalError("Database unavailable", cause).cause).toBe(cause);
  });

  it("rejects non-AppError values from the type guard", () => {
    expect(AppError.isAppError(new Error("x"))).toBe(false);
    expect(AppError.isAppError({ code: ErrorCode.FORBIDDEN })).toBe(false);
  });

  it("recovers the status from runtime-wrapped and cloned errors", () => {
    const recovered = AppError.unwrap({
      cause: undefined,
      error: {
        name: "UnauthorizedError",
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
    expect(recovered?.statusCode).toBe(401);
    expect(recovered?.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("unwraps direct, cloned, nested, cyclic, and invalid values safely", () => {
    const direct = new ForbiddenError("nope", { reason: "role" });
    expect(AppError.unwrap(direct)).toBe(direct);

    const cloned = AppError.unwrap({
      statusCode: 422,
      code: "DOMAIN_RULE_VIOLATION",
      message: "rule failed",
      details: { field: "status" },
    });
    expect(cloned?.toJSON()).toMatchObject({
      code: ErrorCode.DOMAIN_RULE_VIOLATION,
      message: "rule failed",
      details: { field: "status" },
    });
    expect(cloned?.statusCode).toBe(422);

    const withoutDetails = AppError.unwrap({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "missing",
      details: "not-an-object",
    });
    expect(withoutDetails?.details).toBeUndefined();

    expect(
      AppError.unwrap({
        original: { value: new ConflictError("nested") },
      }),
    ).toBeInstanceOf(ConflictError);

    const cyclic: Record<string, unknown> = {};
    cyclic.cause = cyclic;
    cyclic.error = null;
    expect(AppError.unwrap(cyclic)).toBeUndefined();
    expect(AppError.unwrap(undefined)).toBeUndefined();
    expect(AppError.unwrap("plain-error")).toBeUndefined();

    for (const invalid of [
      { statusCode: 399, code: "FORBIDDEN", message: "x" },
      { statusCode: 600, code: "FORBIDDEN", message: "x" },
      { statusCode: 403, code: "UNKNOWN", message: "x" },
      { statusCode: 403, code: "FORBIDDEN", message: 123 },
      { statusCode: "403", code: "FORBIDDEN", message: "x" },
    ]) {
      expect(AppError.unwrap(invalid)).toBeUndefined();
    }
  });
});
