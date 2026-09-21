import { usePermissions } from "@/shared/auth/permissions";
import { useEffect, useState } from "react";
import { Plus, AlertTriangle, Package } from "lucide-react";
import {
  Button,
  Card,
  StatCard,
  Badge,
  Page,
  PageHeader,
  Grid,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/features/branches";
import { useInventoryItems, useLowStockItems } from "@/features/inventory";
import { useInventoryRealtimeSync } from "@/features/inventory/hooks/useInventoryRealtimeSync";
import { useInventoryTransactions } from "@/features/inventory/hooks/useInventoryTransactions";
import type { InventoryItem } from "@pos/types";
import { InventoryImpactDialog } from "@/features/inventory/components/InventoryImpactDialog";
import { InventoryWasteDialog } from "@/features/inventory/components/InventoryWasteDialog";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { InventoryActivity } from "@/features/inventory/components/InventoryActivity";
import { InventoryItemDialogs } from "@/features/inventory/components/InventoryItemDialogs";
import { extractApiError } from "@/shared/lib/api-client";
import { InventoryFilters } from "@/features/inventory/components/page/InventoryFilters";
import { InventoryList } from "@/features/inventory/components/page/InventoryList";

export const InventoryPage = () => {
  const { has } = usePermissions();
  const { branchId } = useAuthStore();
  const isAggregate = branchId === "all";

  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState<InventoryItem | null>(null);
  const [showWaste, setShowWaste] = useState<InventoryItem | null>(null);
  const [showImpact, setShowImpact] = useState<InventoryItem | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const branchesQuery = useBranches({ enabled: isAggregate });

  const inventoryQuery = useInventoryItems({
    page,
    limit: pageSize,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(stockFilter === "low" ? { lowStockOnly: true } : {}),
  });
  const lowStockQuery = useLowStockItems();
  const inventoryPage = inventoryQuery.data;
  const lowStock = lowStockQuery.data ?? [];
  const items = inventoryPage?.items ?? [];
  const totalItems = inventoryPage?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const transactionsQuery = useInventoryTransactions();
  const branches = branchesQuery.data;
  const transactions = transactionsQuery.data;

  useInventoryRealtimeSync();

  const groupedByBranch = isAggregate
    ? Object.entries(
        items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
          const key = item.branch?.name ?? "Unknown branch";
          (acc[key] ??= []).push(item);
          return acc;
        }, {}),
      )
    : null;

  return (
    <Page>
      <PageHeader
        title="Inventory"
        description={
          inventoryQuery.isError && inventoryPage === undefined
            ? "Inventory data is currently unavailable"
            : `${totalItems} items tracked in the current view`
        }
        actions={
          has("inventory:create") && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          )
        }
      />

      <Grid columns={{ base: 2, lg: 4 }} gap="md">
        <StatCard
          title="Total Items"
          value={
            inventoryQuery.isError && inventoryPage === undefined
              ? "Unavailable"
              : totalItems
          }
          icon={Package}
          color="violet"
        />
        <StatCard
          title="Low Stock"
          value={
            lowStockQuery.isError && lowStockQuery.data === undefined
              ? "Unavailable"
              : lowStock.length
          }
          icon={AlertTriangle}
          color={
            lowStockQuery.isError && lowStockQuery.data === undefined
              ? "amber"
              : lowStock.length
                ? "red"
                : "emerald"
          }
        />
      </Grid>

      {inventoryQuery.isError && inventoryPage === undefined ? (
        <QueryErrorState
          title="Unable to load inventory"
          description={extractApiError(
            inventoryQuery.error,
            "Inventory could not be loaded. Retry before relying on stock levels.",
          )}
          isRetrying={inventoryQuery.isFetching}
          onRetry={() => void inventoryQuery.refetch()}
        />
      ) : null}

      {inventoryQuery.isError && inventoryPage !== undefined ? (
        <StaleDataBanner
          message="Inventory refresh failed — showing the latest stock data available."
          isRetrying={inventoryQuery.isFetching}
          onRetry={() => void inventoryQuery.refetch()}
        />
      ) : null}

      {lowStockQuery.isError ? (
        <StaleDataBanner
          message={
            lowStockQuery.data === undefined
              ? "Low-stock status is unavailable. Do not interpret the KPI as zero."
              : "Low-stock refresh failed — showing the latest low-stock data available."
          }
          isRetrying={lowStockQuery.isFetching}
          onRetry={() => void lowStockQuery.refetch()}
        />
      ) : null}

      {!!lowStock.length && (
        <Card padding="md" className="bg-danger-surface border-danger/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <p className="text-sm font-semibold text-danger">
              Low Stock Alerts ({lowStock.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <Badge key={item.id} variant="danger">
                {isAggregate && item.branch ? `${item.branch.name} · ` : ""}
                {item.name} — {parseFloat(String(item.currentStock))}{" "}
                {item.unit}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <InventoryFilters
        search={search}
        stockFilter={stockFilter}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStockFilter={(value) => {
          setStockFilter(value);
          setPage(1);
        }}
        onClear={() => {
          setSearch("");
          setStockFilter("");
          setPage(1);
        }}
      />

      {inventoryQuery.isError && inventoryPage === undefined ? null : (
        <InventoryList
          items={items}
          groupedByBranch={groupedByBranch}
          aggregate={isAggregate}
          loading={inventoryQuery.isLoading}
          page={page}
          pageCount={pageCount}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          onUpdateStock={setShowUpdate}
          onLogWaste={setShowWaste}
          onViewImpact={setShowImpact}
          onAddItem={() => setShowAdd(true)}
        />
      )}

      {transactionsQuery.isError ? (
        <StaleDataBanner
          message={
            transactionsQuery.data === undefined
              ? "Recent stock activity is unavailable."
              : "Recent stock activity could not be refreshed."
          }
          isRetrying={transactionsQuery.isFetching}
          onRetry={() => void transactionsQuery.refetch()}
        />
      ) : null}
      {transactionsQuery.isError &&
      transactionsQuery.data === undefined ? null : (
        <InventoryActivity transactions={transactions} />
      )}

      <InventoryItemDialogs
        addOpen={showAdd}
        updateItem={showUpdate}
        aggregate={isAggregate}
        branches={branches ?? []}
        onCloseAdd={() => setShowAdd(false)}
        onCloseUpdate={() => setShowUpdate(null)}
      />

      <InventoryImpactDialog
        item={showImpact}
        onClose={() => setShowImpact(null)}
      />
      <InventoryWasteDialog
        item={showWaste}
        onClose={() => setShowWaste(null)}
      />
    </Page>
  );
};
