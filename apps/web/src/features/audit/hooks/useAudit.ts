import { useInfiniteQuery } from "@tanstack/react-query";
import { auditKeys } from "../query-keys";
import { auditService } from "../services/audit.service";

const PAGE_SIZE = 50;

export const useAuditLog = () =>
  useInfiniteQuery({
    queryKey: auditKeys.list(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => auditService.list(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE
        ? lastPage[lastPage.length - 1]?.createdAt
        : undefined,
  });

export const useMenuAuditHistory = (entityType: string, changeType: string) =>
  useInfiniteQuery({
    queryKey: auditKeys.menuHistory(entityType, changeType),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      auditService.menuHistory({
        ...(entityType ? { entityType } : {}),
        ...(changeType ? { changeType } : {}),
        ...(pageParam ? { before: pageParam } : {}),
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE
        ? lastPage[lastPage.length - 1]?.changedAt
        : undefined,
  });
