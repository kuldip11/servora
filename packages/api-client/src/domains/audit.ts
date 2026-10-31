import type { AuditLogResponse, MenuChangeEventResponse } from "@pos/contracts";
import { getDomainData, type DomainHttpClient } from "./shared";

export type AuditEntryDto = AuditLogResponse;
export type MenuHistoryEntryDto = MenuChangeEventResponse;

export const createAuditApi = (client: DomainHttpClient) => {
  return {
    list(
      params: Record<string, string | number | undefined>,
    ): Promise<AuditEntryDto[]> {
      return getDomainData<AuditEntryDto[]>(client, "/audit", { params });
    },
    menuHistory(
      filters: Record<string, string | number | undefined> = {},
    ): Promise<MenuHistoryEntryDto[]> {
      return getDomainData<MenuHistoryEntryDto[]>(client, "/menu/history", {
        params: filters,
      });
    },
  };
};
