import type { ApprovalThreshold, ManagerApprovalToken } from "@pos/contracts";

interface ApprovalThresholdRecord {
  id: string;
  tenantId: string;
  actionType: "VOID" | "COMP";
  thresholdAmount: string;
  requiresRole: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toApprovalThresholdResponse = (
  threshold: ApprovalThresholdRecord,
): ApprovalThreshold => ({
  id: threshold.id,
  tenantId: threshold.tenantId,
  actionType: threshold.actionType,
  thresholdAmount: threshold.thresholdAmount,
  requiresRole: threshold.requiresRole,
  createdAt: threshold.createdAt.toISOString(),
  updatedAt: threshold.updatedAt.toISOString(),
});

export const toManagerApprovalTokenResponse = (token: {
  token: string;
  expiresAt: Date;
}): ManagerApprovalToken => ({
  token: token.token,
  expiresAt: token.expiresAt.toISOString(),
});
