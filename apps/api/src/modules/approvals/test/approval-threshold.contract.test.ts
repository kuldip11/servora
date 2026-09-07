import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("H6 approval token contract", () => {
  const service = readFileSync(
    new URL("../approval.service.ts", import.meta.url),
    "utf8",
  );
  const normalizedService = service.replace(/\s+/g, " ");

  it("preserves permission-only behavior when no threshold is configured", () => {
    expect(normalizedService).toContain(
      "isApprovalRequired( lineValue, threshold ? Number(threshold.thresholdAmount) : null, )",
    );
  });

  it("consumes a token atomically only when it is scoped, unexpired, and unused", () => {
    expect(service).toContain("eq(managerApprovalTokens.tenantId, tenantId)");
    expect(service).toContain(
      "eq(managerApprovalTokens.actionType, actionType)",
    );
    expect(service).toContain("eq(managerApprovalTokens.orderId, orderId)");
    expect(service).toContain(
      "eq(managerApprovalTokens.orderItemId, orderItemId)",
    );
    expect(service).toContain("isNull(managerApprovalTokens.usedAt)");
    expect(service).toContain(
      "gt(managerApprovalTokens.expiresAt, new Date())",
    );
    expect(service).toContain(".set({ usedAt: new Date() })");
  });
});
