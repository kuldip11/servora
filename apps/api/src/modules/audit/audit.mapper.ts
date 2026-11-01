import type { AuditLogResponse } from "@pos/contracts";

export type AuditLogRecord = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  branchId: string | null;
  requestId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
};

export const toAuditLogResponse = (row: AuditLogRecord): AuditLogResponse => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});
