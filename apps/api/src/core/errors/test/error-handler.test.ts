import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "../app-error";
import { handleApiError } from "../error-handler";

const context = (error: unknown, options: { code?: string; requestId?: string } = {}) => {
  const set: { status?: number | string } = {};
  const result = handleApiError({
    code: options.code ?? "UNKNOWN",
    error,
    set,
    requestContext: { requestId: options.requestId ?? "req-test" },
    request: new Request("http://localhost/api/test"),
  });
  return { set, result };
};

describe("global API error handler", () => {
  it("serializes domain errors with stable public codes", () => {
    const { set, result } = context(
      new ConflictError("This table already has an open order.", {
        reason: "TABLE_OCCUPIED",
        internalId: "do-not-expose",
      }),
    );
    expect(set.status).toBe(409);
    expect(result).toEqual({
      success: false,
      error: {
        code: "TABLE_OCCUPIED",
        message: "This table already has an open order.",
        retryable: false,
        requestId: "req-test",
      },
    });
    expect(JSON.stringify(result)).not.toContain("do-not-expose");
  });

  it("returns friendly validation errors and field metadata", () => {
    const { set, result } = context(
      new ValidationError("Name is required.", { field: "name" }),
    );
    expect(set.status).toBe(400);
    expect(result.error).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Name is required.",
      fieldErrors: { name: ["Name is required."] },
      retryable: false,
    });
  });

  it("sanitizes framework validation failures", () => {
    const { set, result } = context(
      {
        message: "Expected string at /body/name; schema internals",
        all: [
          { path: "/body/name", summary: "Name is required." },
          { path: "/body/email", message: "Email must be valid." },
        ],
      },
      { code: "VALIDATION" },
    );
    expect(set.status).toBe(400);
    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Please check the information you entered.",
        retryable: false,
        requestId: "req-test",
        fieldErrors: {
          name: ["Name is required."],
          email: ["Email must be valid."],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("schema internals");
  });

  it("maps database conflicts without leaking database details", () => {
    const { set, result } = context({
      code: "23505",
      detail: 'Key (email)=(secret@example.com) already exists',
      stack: "postgres internals",
    });
    expect(set.status).toBe(409);
    expect(result.error).toMatchObject({
      code: "RESOURCE_ALREADY_EXISTS",
      message: "This information already exists.",
      retryable: false,
    });
    expect(JSON.stringify(result)).not.toContain("secret@example.com");
  });

  it("never exposes unexpected exception messages or stacks", () => {
    const error = new Error("ECONNREFUSED redis://private-host:6379");
    error.stack = "/private/path/service.ts:42";
    const { set, result } = context(error);
    expect(set.status).toBe(500);
    expect(result).toEqual({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong while processing your request. Please try again.",
        retryable: true,
        requestId: "req-test",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/ECONNREFUSED|private-host|service\.ts/);
  });

  it("returns a safe route-not-found response", () => {
    const { set, result } = context(new Error("route internals"), {
      code: "NOT_FOUND",
    });
    expect(set.status).toBe(404);
    expect(result.error).toMatchObject({
      code: "ROUTE_NOT_FOUND",
      retryable: false,
    });
  });
});
