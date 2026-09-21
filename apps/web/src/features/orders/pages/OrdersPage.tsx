import { usePermissions } from "@/shared/auth/permissions";
import { useEffect, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import { Button, Table, Page, Card, Pagination, type SortState } from "@pos/ui";
import { useOrdersPage } from "@/features/orders";
import { useOrdersRealtimeSync } from "@/features/orders/hooks/useOrdersRealtimeSync";
import { CreateOrderModal } from "@/features/orders/components/CreateOrderModal";
import { ORDER_COLUMNS } from "@/features/orders/components/page/order-columns";
import { OrdersToolbar } from "@/features/orders/components/page/OrdersToolbar";

export const OrdersPage = () => {
  const { has } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useOrdersPage({
    status: statusFilter,
    type: typeFilter,
    search: debouncedSearch,
    page,
    limit: pageSize,
    ...(sort?.columnId === "time"
      ? { sortBy: "createdAt" as const }
      : sort?.columnId === "total" || sort?.columnId === "id"
        ? { sortBy: sort.columnId }
        : {}),
    ...(sort?.direction ? { sortDirection: sort.direction } : {}),
  });
  useOrdersRealtimeSync();
  const orders = result?.items ?? [];
  const total = result?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns = ORDER_COLUMNS;

  return (
    <Page
      contained={false}
      className="mx-auto h-full min-h-0 w-full max-w-screen-xl overflow-hidden px-4 py-4 sm:px-6 lg:px-8"
    >
      <Card
        padding="none"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <OrdersToolbar
          total={total}
          search={search}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          canCreate={has("orders:create")}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onStatusFilter={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          onTypeFilter={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
          onClear={() => {
            setSearch("");
            setStatusFilter("");
            setTypeFilter("");
            setPage(1);
          }}
          onCreate={() => setShowCreate(true)}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-md">
          <Table
            columns={columns}
            data={orders}
            getRowId={(row) => row.id}
            loading={isLoading || (isFetching && orders.length === 0)}
            sort={sort}
            onSortChange={(next) => {
              setSort(next);
              setPage(1);
            }}
            maxHeight="100%"
            className="min-h-0 flex-1"
            emptyIcon={ShoppingBag}
            emptyTitle="No orders found"
            emptyDescription="Create a new order or adjust your filters."
            emptyAction={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> New Order
              </Button>
            }
          />
          <Pagination
            className="border-t border-border px-2 pt-4 mt-4"
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} />}
    </Page>
  );
};
