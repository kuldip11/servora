import type { CustomerRequestResponse } from "@pos/contracts";
import { InternalError } from "@/core/errors";
import { customerRequests } from "@/db/schema/customer-request.schema";

type CustomerRequestRecord = typeof customerRequests.$inferSelect;
export const toCustomerRequestResponse = (
  row: CustomerRequestRecord | undefined,
): CustomerRequestResponse => {
  if (!row)
    throw new InternalError("Customer request response could not be loaded");
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    tableId: row.tableId,
    customerSessionId: row.customerSessionId,
    orderId: row.orderId,
    type: row.type,
    status: row.status,
    note: row.note,
    resolvedBy: row.resolvedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
