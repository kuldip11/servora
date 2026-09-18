import type { TableResponse } from "@pos/contracts";
import { restaurantTables } from "@/db/schema";

type TableRecord = typeof restaurantTables.$inferSelect;

export const toTableResponse = (table: TableRecord): TableResponse => ({
  id: table.id,
  tenantId: table.tenantId,
  branchId: table.branchId,
  name: table.name,
  publicQrToken: table.publicQrToken,
  capacity: table.capacity,
  status: table.status,
  section: table.section,
  isActive: table.isActive,
  createdAt: table.createdAt.toISOString(),
  updatedAt: table.updatedAt.toISOString(),
});
