import { usePermissions } from "@/shared/auth/permissions";
import { useEffect, useState } from "react";
import { Plus, AlertTriangle, Package, Building2 } from "lucide-react";
import {
  Button,
  Card,
  StatCard,
  Badge,
  Page,
  PageHeader,
  Grid,
  FilterBar,
  SearchInput,
  SelectMenu,
  Pagination,
} from "@pos/ui";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/features/branches/hooks/useBranches";
import {
  useInventoryItems,
  useLowStockItems,
} from "@/features/inventory/hooks/useInventoryItems";
import { useInventoryRealtimeSync } from "@/features/inventory/hooks/useInventoryRealtimeSync";
import { useInventoryTransactions } from "@/features/inventory/hooks/useInventoryTransactions";
import type { InventoryItem } from "@pos/types";
import { InventoryImpactDialog } from "@/features/inventory/components/InventoryImpactDialog";
import { InventoryWasteDialog } from "@/features/inventory/components/InventoryWasteDialog";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { InventoryActivity } from "@/features/inventory/components/InventoryActivity";
import { InventoryItemDialogs } from "@/features/inventory/components/InventoryItemDialogs";

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

  const { data: branches } = useBranches({ enabled: isAggregate });

  const { data: inventoryPage, isLoading } = useInventoryItems({
    page,
    limit: pageSize,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(stockFilter === "low" ? { lowStockOnly: true } : {}),
  });
  const { data: lowStock = [] } = useLowStockItems();
  const items = inventoryPage?.items ?? [];
  const totalItems = inventoryPage?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const { data: transactions } = useInventoryTransactions();

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
        description={`${totalItems} items tracked in the current view`}
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
          value={totalItems}
          icon={Package}
          color="violet"
        />
        <StatCard
          title="Low Stock"
          value={lowStock.length}
          icon={AlertTriangle}
          color={lowStock.length ? "red" : "emerald"}
        />
      </Grid>

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

      <Card padding="sm">
        <FilterBar
          onClearAll={
            search && stockFilter
              ? () => {
                  setSearch("");
                  setStockFilter("");
                  setPage(1);
                }
              : undefined
          }
        >
          <SearchInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setPage(1);
            }}
            placeholder="Search item or branch"
            aria-label="Search inventory"
            className="w-full sm:w-72"
          />
          <SelectMenu
            aria-label="Filter inventory by stock level"
            valuePrefix="Stock"
            value={stockFilter || undefined}
            placeholder="All stock levels"
            options={[
              { value: "", label: "All stock levels" },
              { value: "low", label: "Low stock only" },
            ]}
            onChange={(value) => {
              setStockFilter(value ?? "");
              setPage(1);
            }}
            className="w-48"
          />
        </FilterBar>
      </Card>

      {isAggregate && groupedByBranch ? (
        <Card padding="none" className="overflow-hidden">
          {groupedByBranch.map(([branchName, branchItems], idx) => (
            <div
              key={branchName}
              className={idx > 0 ? "border-t border-border" : undefined}
            >
              <div className="px-4 py-2.5 bg-surface-secondary flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-text-disabled" />
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  {branchName}
                </p>
              </div>
              <InventoryTable
                items={branchItems}
                loading={isLoading}
                onUpdateStock={setShowUpdate}
                onLogWaste={setShowWaste}
                onViewImpact={setShowImpact}
              />
            </div>
          ))}
          <Pagination
            className="border-t border-border p-4"
            page={page}
            pageCount={pageCount}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <InventoryTable
            items={items}
            loading={isLoading}
            onUpdateStock={setShowUpdate}
            onLogWaste={setShowWaste}
            onViewImpact={setShowImpact}
            onAddItem={() => setShowAdd(true)}
          />
          <Pagination
            className="border-t border-border p-4"
            page={page}
            pageCount={pageCount}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </Card>
      )}

      <InventoryActivity transactions={transactions} />

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
