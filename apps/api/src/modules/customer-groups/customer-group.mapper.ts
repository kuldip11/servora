import type { CustomerGroupResponse } from "@pos/contracts";
import { customerGroups } from "@/db/schema";

type CustomerGroupRecord = typeof customerGroups.$inferSelect;
export const toCustomerGroupResponse = (
  row: CustomerGroupRecord,
): CustomerGroupResponse => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  discountPercent:
    row.discountPercent == null ? null : Number(row.discountPercent),
  discountFixed: row.discountFixed == null ? null : Number(row.discountFixed),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
