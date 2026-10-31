import { beforeEach, describe, expect, it, vi } from "vitest";

const { findThreshold, tokenReturning, tokenSet, update } = vi.hoisted(() => {
  const findThreshold = vi.fn();
  const tokenReturning = vi.fn();
  const tokenWhere = vi.fn(() => ({ returning: tokenReturning }));
  const tokenSet = vi.fn(() => ({ where: tokenWhere }));
  const update = vi.fn(() => ({ set: tokenSet }));
  return { findThreshold, tokenReturning, tokenWhere, tokenSet, update };
});
vi.mock("../../../db", () => ({
  db: {
    query: {
      voidCompApprovalThresholds: { findFirst: findThreshold },
      users: { findFirst: vi.fn() },
    },
    update,
  },
}));
vi.mock("../../../core/auth", () => ({ requirePermission: vi.fn() }));
vi.mock("../../../core/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

import { approvalService } from "@/modules/approvals/approval.service";

describe("H6 approval-token behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findThreshold.mockResolvedValue({ thresholdAmount: "500.00" });
    tokenReturning.mockResolvedValue([{ id: "token", usedAt: new Date() }]);
  });

  it("preserves permission-only behavior when no threshold is configured", async () => {
    findThreshold.mockResolvedValue(undefined);
    await expect(
      approvalService.assertApproved("tenant", "COMP", "order", "item", 9999),
    ).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not consume approval below or exactly at the threshold", async () => {
    await approvalService.assertApproved(
      "tenant",
      "COMP",
      "order",
      "item",
      499.99,
    );
    await approvalService.assertApproved(
      "tenant",
      "COMP",
      "order",
      "item",
      500,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("requires a token above the threshold", async () => {
    await expect(
      approvalService.assertApproved("tenant", "COMP", "order", "item", 500.01),
    ).rejects.toThrow("Manager approval required");
  });

  it("atomically consumes a valid single-use token", async () => {
    await expect(
      approvalService.assertApproved(
        "tenant",
        "VOID",
        "order",
        "item",
        700,
        "token",
      ),
    ).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledOnce();
    expect(tokenSet).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
  });

  it("rejects an expired, stale, wrong-scope, or already-used token when the atomic update matches no row", async () => {
    tokenReturning.mockResolvedValue([]);
    await expect(
      approvalService.assertApproved(
        "tenant",
        "VOID",
        "order",
        "item",
        700,
        "token",
      ),
    ).rejects.toThrow("Manager approval is invalid, expired, or already used");
  });
});
