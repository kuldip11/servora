import {
  createAuditApi,
  type AuditEntryDto,
  type MenuHistoryEntryDto,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const auditApi = createAuditApi(apiClient);

export type AuditEntry = AuditEntryDto;
export type MenuHistoryEntry = MenuHistoryEntryDto;

export const auditService = {
  async list(limit = 50, before?: string): Promise<AuditEntry[]> {
    return auditApi.list({ limit, before });
  },
  async menuHistory(
    filters: {
      entityType?: string;
      changeType?: string;
      entityId?: string;
      limit?: number;
      before?: string;
    } = {},
  ): Promise<MenuHistoryEntry[]> {
    return auditApi.menuHistory(filters);
  },
};
