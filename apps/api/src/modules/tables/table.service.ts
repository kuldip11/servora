import type { CreateTableRequest, UpdateTableRequest } from "@pos/contracts";
import type { TableStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { tableRepository } from "./table.repository";
import { branchRepository } from "@/modules/branches/branch.repository";
import {
  tableNotFound,
  branchNotFound,
  branchRequiredForTable,
  tablesDisabledForBranch,
  tableHasActiveOrder,
  tableHasOpenOrder,
} from "./table.errors";
import {
  assertTableListScope,
  assertTableResourceAccess,
  requireTablesPermission,
  resolveTableBranch,
} from "./tables-authorization";

export type CreateTableInput = CreateTableRequest;
export type UpdateTableInput = UpdateTableRequest;

export const tableService = {
  async list(auth: AuthContext) {
    requireTablesPermission(auth, "tables:read");
    assertTableListScope(auth);
    return tableRepository.findMany(auth.tenantId, auth.branchId);
  },

  async create(auth: AuthContext, input: CreateTableInput) {
    requireTablesPermission(auth, "tables:create");
    let branchId: string;
    try {
      branchId = resolveTableBranch(auth, input.branchId);
    } catch (error) {
      if (!input.branchId && !auth.branchId) throw branchRequiredForTable();
      throw error;
    }
    if (!branchId) throw branchRequiredForTable();

    const branch = await branchRepository.findById(auth.tenantId, branchId);
    if (!branch) throw branchNotFound(branchId);
    if (!branch.tablesEnabled) throw tablesDisabledForBranch();

    return tableRepository.create({
      tenantId: auth.tenantId,
      branchId,
      name: input.name,
      capacity: input.capacity,
      section: input.section,
    });
  },

  async regenerateQr(auth: AuthContext, tableId: string) {
    requireTablesPermission(auth, "tables:update");
    const table = await tableRepository.findById(auth.tenantId, tableId);
    if (!table) throw tableNotFound(tableId);
    assertTableResourceAccess(auth, table.branchId);
    const updated = await tableRepository.regenerateQrToken(
      auth.tenantId,
      tableId,
    );
    if (!updated) throw tableNotFound(tableId);
    return updated;
  },

  async update(auth: AuthContext, tableId: string, changes: UpdateTableInput) {
    requireTablesPermission(auth, "tables:update");
    const table = await tableRepository.findById(auth.tenantId, tableId);
    if (!table) throw tableNotFound(tableId);
    assertTableResourceAccess(auth, table.branchId);

    if (changes.status !== undefined) {
      await assertNoActiveOrder(auth.tenantId, tableId);
    }

    const updated = await tableRepository.update(
      auth.tenantId,
      tableId,
      changes,
    );
    if (!updated) throw tableNotFound(tableId);
    return updated;
  },

  async updateStatus(auth: AuthContext, tableId: string, status: TableStatus) {
    requireTablesPermission(auth, "tables:update");
    const table = await tableRepository.findById(auth.tenantId, tableId);
    if (!table) throw tableNotFound(tableId);
    assertTableResourceAccess(auth, table.branchId);

    await assertNoActiveOrder(auth.tenantId, tableId);

    const updated = await tableRepository.update(auth.tenantId, tableId, {
      status,
    });
    if (!updated) throw tableNotFound(tableId);
    return updated;
  },

  async remove(auth: AuthContext, tableId: string) {
    requireTablesPermission(auth, "tables:delete");
    const table = await tableRepository.findById(auth.tenantId, tableId);
    if (!table) throw tableNotFound(tableId);
    assertTableResourceAccess(auth, table.branchId);

    const hasOpenOrders = await tableRepository.hasOpenOrders(
      auth.tenantId,
      tableId,
    );
    if (hasOpenOrders) throw tableHasOpenOrder();

    const deleted = await tableRepository.softDelete(auth.tenantId, tableId);
    if (!deleted) throw tableNotFound(tableId);
    return deleted;
  },
};

async function assertNoActiveOrder(
  tenantId: string,
  tableId: string,
): Promise<void> {
  const hasOpenOrders = await tableRepository.hasOpenOrders(tenantId, tableId);
  if (hasOpenOrders) throw tableHasActiveOrder();
}
