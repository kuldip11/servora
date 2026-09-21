import { useInfiniteQuery } from "@tanstack/react-query";
import { Badge, Button, Card, Page, PageHeader, Select } from "@pos/ui";
import { ShieldCheck } from "lucide-react";
import { auditService } from "@/features/audit/services/audit.service";
import { useState } from "react";

const formatAction = (action: string) => {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter: string) => letter.toUpperCase());
};

const formatMetadata = (metadata: string | null) => {
  if (!metadata) return "";
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([key]) => key !== "branchId")
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" · ");
  } catch {
    return metadata;
  }
};

export const AuditLogPage = () => {
  const [entityType, setEntityType] = useState("");
  const [changeType, setChangeType] = useState("");
  const pageSize = 50;
  const {
    data: auditPages,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["audit", "list"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => auditService.list(pageSize, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.length === pageSize
        ? lastPage[lastPage.length - 1]?.createdAt
        : undefined,
  });
  const {
    data: menuPages,
    isLoading: menuHistoryLoading,
    hasNextPage: hasMoreMenuHistory,
    fetchNextPage: fetchMoreMenuHistory,
    isFetchingNextPage: isFetchingMoreMenuHistory,
  } = useInfiniteQuery({
    queryKey: ["audit", "menu-history", entityType, changeType],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      auditService.menuHistory({
        ...(entityType ? { entityType } : {}),
        ...(changeType ? { changeType } : {}),
        ...(pageParam ? { before: pageParam } : {}),
        limit: pageSize,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.length === pageSize
        ? lastPage[lastPage.length - 1]?.changedAt
        : undefined,
  });
  const data = auditPages?.pages.flat() ?? [];
  const menuHistory = menuPages?.pages.flat() ?? [];

  return (
    <Page>
      <PageHeader
        title="Audit log"
        description="A tenant-scoped history of important operational changes"
      />
      <Card>
        <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-surface text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Recent activity
            </h2>
            <p className="text-xs text-text-secondary">
              Branch users only see events within their authorized scope.
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-lg bg-surface-secondary"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-danger">
            Unable to load the audit log.
          </p>
        ) : !data.length ? (
          <p className="py-8 text-center text-sm text-text-disabled">
            No audit events yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {data.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-2 py-4 md:grid-cols-[10rem_1fr_auto] md:items-center"
              >
                <div>
                  <Badge variant="info">{formatAction(entry.action)}</Badge>
                  <p className="mt-1 text-xs text-text-secondary">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {entry.userName ?? "System"}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {entry.entity}
                    {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}…` : ""}
                    {formatMetadata(entry.metadata)
                      ? ` · ${formatMetadata(entry.metadata)}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-text-disabled md:text-right">
                  {entry.userId ? "User action" : "System action"}
                </span>
              </div>
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  loading={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  Load older activity
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
      <Card>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Menu history
            </h2>
            <p className="text-xs text-text-secondary">
              History starts from the menu-audit deployment date; earlier edits
              are not reconstructed.
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              aria-label="Entity type"
              value={entityType}
              onChange={setEntityType}
              className="text-sm"
              options={[
                { value: "", label: "All entities" },
                { value: "MENU_ITEM", label: "Items" },
                { value: "MENU", label: "Menus" },
                { value: "CATEGORY", label: "Categories" },
                { value: "PRICE_RULE", label: "Price rules" },
                { value: "MENU_MEMBERSHIP", label: "Memberships" },
              ]}
            />
            <Select
              aria-label="Change type"
              value={changeType}
              onChange={setChangeType}
              className="text-sm"
              options={[
                { value: "", label: "All changes" },
                ...[
                  "CREATED",
                  "UPDATED",
                  "PUBLISHED",
                  "ARCHIVED",
                  "DELETED",
                ].map((type) => ({ value: type, label: formatAction(type) })),
              ]}
            />
          </div>
        </div>
        {menuHistoryLoading ? (
          <p className="py-8 text-center text-sm text-text-disabled">
            Loading menu history…
          </p>
        ) : !menuHistory.length ? (
          <p className="py-8 text-center text-sm text-text-disabled">
            No matching menu changes yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {menuHistory.map((event) => (
              <div
                key={event.id}
                className="grid gap-2 py-4 md:grid-cols-[10rem_12rem_1fr]"
              >
                <div>
                  <Badge variant="info">{formatAction(event.changeType)}</Badge>
                  <p className="mt-1 text-xs text-text-secondary">
                    {new Date(event.changedAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {formatAction(event.entityType)}
                  <span className="block font-normal text-text-secondary">
                    {event.entityId.slice(0, 8)}…
                  </span>
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-text-secondary">
                  {JSON.stringify(event.diff, null, 2)}
                </pre>
              </div>
            ))}
            {hasMoreMenuHistory && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  loading={isFetchingMoreMenuHistory}
                  onClick={() => fetchMoreMenuHistory()}
                >
                  Load older menu changes
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </Page>
  );
};
