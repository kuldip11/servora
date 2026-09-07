import { describe, expect, it } from "vitest";
import {
  approvalAdjustmentValue,
  approvalRoleMatches,
  isApprovalRequired,
} from "@/modules/approvals/approval-policy";

describe("H6 approval policy", () => {
  it("does not require approval below or exactly at the threshold, but does above it", () => {
    expect(isApprovalRequired(499.99, 500)).toBe(false);
    expect(isApprovalRequired(500, 500)).toBe(false);
    expect(isApprovalRequired(500.01, 500)).toBe(true);
    expect(isApprovalRequired(999, null)).toBe(false);
  });

  it("uses the whole active combo group as the affected value", () => {
    const items = [
      {
        id: "parent",
        comboGroupId: "combo",
        itemStatus: "ACTIVE",
        subtotal: "0",
      },
      {
        id: "cheap",
        comboGroupId: "combo",
        itemStatus: "ACTIVE",
        subtotal: "100",
      },
      {
        id: "expensive",
        comboGroupId: "combo",
        itemStatus: "ACTIVE",
        subtotal: "700",
      },
      {
        id: "old",
        comboGroupId: "combo",
        itemStatus: "VOIDED",
        subtotal: "900",
      },
    ];
    expect(approvalAdjustmentValue(items, "cheap")).toBe(800);
    expect(
      isApprovalRequired(approvalAdjustmentValue(items, "cheap"), 500),
    ).toBe(true);
  });

  it("honors the configured role while retaining owner override", () => {
    expect(approvalRoleMatches("Supervisor", "Supervisor")).toBe(true);
    expect(approvalRoleMatches("Manager", "Supervisor")).toBe(false);
    expect(approvalRoleMatches("Owner", "Supervisor")).toBe(true);
  });
});

describe("approval policy edge coverage", () => {
  it("returns zero for a missing target and handles a standalone item", () => {
    expect(approvalAdjustmentValue([], "missing")).toBe(0);
    expect(
      approvalAdjustmentValue(
        [
          { id: "one", itemStatus: "ACTIVE", subtotal: 12.5 },
          { id: "two", itemStatus: "ACTIVE", subtotal: 99 },
        ],
        "one",
      ),
    ).toBe(12.5);
  });

  it("handles undefined thresholds and global-owner role override with whitespace/case normalization", () => {
    expect(isApprovalRequired(100, undefined)).toBe(false);
    expect(approvalRoleMatches(" Global Owner ", " Supervisor ")).toBe(true);
  });
});
