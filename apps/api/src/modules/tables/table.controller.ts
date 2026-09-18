import type { CreateTableRequest, UpdateTableRequest } from "@pos/contracts";
import type { TableStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { toTableResponse } from "./table.mapper";
import { tableService } from "./table.service";

export const tableController = {
  async list(auth: AuthContext) {
    const tables = await tableService.list(auth);
    return successResponse(tables.map(toTableResponse));
  },

  async create(auth: AuthContext, input: CreateTableRequest) {
    const table = await tableService.create(auth, input);
    return createdResponse(toTableResponse(table));
  },

  async regenerateQr(auth: AuthContext, tableId: string) {
    const updated = await tableService.regenerateQr(auth, tableId);
    return successResponse(toTableResponse(updated));
  },

  async update(
    auth: AuthContext,
    tableId: string,
    changes: UpdateTableRequest,
  ) {
    const updated = await tableService.update(auth, tableId, changes);
    return successResponse(toTableResponse(updated));
  },

  async updateStatus(auth: AuthContext, tableId: string, status: TableStatus) {
    const updated = await tableService.updateStatus(auth, tableId, status);
    return successResponse(toTableResponse(updated));
  },

  async remove(auth: AuthContext, tableId: string) {
    await tableService.remove(auth, tableId);
    return successResponse(null);
  },
};
