import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  apiErrorResponseSchema,
  idParamsSchema,
  managerApprovalIssueBodySchema,
  paginationQuerySchema,
} from "../index";

describe("shared transport contracts", () => {
  it("validates UUID params", () => {
    expect(
      Value.Check(idParamsSchema, {
        id: "00000000-0000-4000-8000-000000000001",
      }),
    ).toBe(true);
    expect(Value.Check(idParamsSchema, { id: "not-an-id" })).toBe(false);
  });

  it("enforces common pagination limits", () => {
    expect(Value.Check(paginationQuerySchema, { page: 1, limit: 100 })).toBe(
      true,
    );
    expect(Value.Check(paginationQuerySchema, { page: 0, limit: 101 })).toBe(
      false,
    );
  });

  it("matches the public API error envelope", () => {
    expect(
      Value.Check(apiErrorResponseSchema, {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Please check the information you entered.",
          retryable: false,
          requestId: "req-1",
          fieldErrors: { name: ["Name is required."] },
        },
      }),
    ).toBe(true);
  });

  it("validates manager approval transport input", () => {
    expect(
      Value.Check(managerApprovalIssueBodySchema, {
        actionType: "VOID",
        orderId: "00000000-0000-4000-8000-000000000001",
        orderItemId: "00000000-0000-4000-8000-000000000002",
        managerEmail: "manager@example.com",
        password: "secret",
      }),
    ).toBe(true);
  });
});
