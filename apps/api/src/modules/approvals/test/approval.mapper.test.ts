import { describe, expect, it } from "vitest";
import {
  toApprovalThresholdResponse,
  toManagerApprovalTokenResponse,
} from "../approval.mapper";

describe("approval response mappers", () => {
  it("maps persistence timestamps to public ISO strings", () => {
    expect(
      toApprovalThresholdResponse({
        id: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
        actionType: "VOID",
        thresholdAmount: "100.00",
        requiresRole: "Manager",
        createdAt: new Date("2026-09-18T00:00:00.000Z"),
        updatedAt: new Date("2026-09-18T00:01:00.000Z"),
      }),
    ).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
      actionType: "VOID",
      thresholdAmount: "100.00",
      requiresRole: "Manager",
      createdAt: "2026-09-18T00:00:00.000Z",
      updatedAt: "2026-09-18T00:01:00.000Z",
    });
  });

  it("maps manager approval expiry to a public ISO string", () => {
    expect(
      toManagerApprovalTokenResponse({
        token: "00000000-0000-4000-8000-000000000003",
        expiresAt: new Date("2026-09-18T00:05:00.000Z"),
      }),
    ).toEqual({
      token: "00000000-0000-4000-8000-000000000003",
      expiresAt: "2026-09-18T00:05:00.000Z",
    });
  });
});
