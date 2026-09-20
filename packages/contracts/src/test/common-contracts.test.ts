import { beforeAll, describe, expect, it } from "vitest";
import { FormatRegistry } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import {
  activeMenuListResponseSchema,
  apiErrorResponseSchema,
  idParamsSchema,
  managerApprovalIssueBodySchema,
  paginationQuerySchema,
} from "../index";

describe("shared transport contracts", () => {
  beforeAll(() => {
    if (!FormatRegistry.Has("date-time")) {
      FormatRegistry.Set(
        "date-time",
        (value) => !Number.isNaN(Date.parse(value)),
      );
    }
  });
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

  it("accepts active menus with memberships", () => {
    const menuId = "11111111-1111-4111-8111-111111111111";
    const tenantId = "22222222-2222-4222-8222-222222222222";
    const itemId = "33333333-3333-4333-8333-333333333333";
    const categoryId = "44444444-4444-4444-8444-444444444444";
    const activeMenuPayload = {
      success: true,
      data: [
        {
          id: menuId,
          tenantId,
          organizationId: null,
          name: "Dinner",
          description: null,
          status: "PUBLISHED",
          isDefault: true,
          availableChannels: ["STAFF"],
          availableFulfillmentTypes: ["DINE_IN"],
          availableBranchIds: null,
          effectiveFrom: null,
          createdAt: "2026-09-20T00:00:00.000Z",
          updatedAt: "2026-09-20T00:00:00.000Z",
          memberships: [
            {
              id: "membership-1",
              menuId,
              menuItemId: itemId,
              categoryId,
              sortOrder: 0,
            },
          ],
        },
      ],
    };

    const errors = [
      ...Value.Errors(activeMenuListResponseSchema, activeMenuPayload),
    ];
    expect(errors).toEqual([]);
    expect(Value.Check(activeMenuListResponseSchema, activeMenuPayload)).toBe(
      true,
    );
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
