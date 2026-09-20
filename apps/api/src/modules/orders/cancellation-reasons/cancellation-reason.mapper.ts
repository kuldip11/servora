import type { CancellationReasonResponse } from "@pos/contracts";
import { cancellationReasons } from "@/db/schema";
import { InternalError } from "@/core/errors";

export type CancellationReasonRecord = typeof cancellationReasons.$inferSelect;
export const toCancellationReasonResponse = (
  row: CancellationReasonRecord | undefined,
): CancellationReasonResponse => {
  if (!row)
    throw new InternalError("Cancellation reason response could not be loaded");
  return {
    id: row.id,
    tenantId: row.tenantId,
    label: row.label,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
