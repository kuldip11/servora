import { usePermissions } from "@/shared/auth/permissions";
import { useMemo } from "react";
import { Page } from "@pos/ui";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/features/branches";
import { createTablesApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { notifyError } from "@/shared/lib/notify";
import { extractApiError } from "@/shared/lib/api-client";

const tablesApi = createTablesApi(apiClient);
import { useTables } from "@/features/tables";
import { useTablesRealtimeSync } from "@/features/tables/hooks/useTablesRealtimeSync";
import { useTablesPageState } from "@/features/tables/hooks/useTablesPageState";
import { useCreateTable } from "@/features/tables/hooks/useCreateTable";
import { useUpdateTable } from "@/features/tables/hooks/useUpdateTable";
import { useUpdateTableStatus } from "@/features/tables/hooks/useUpdateTableStatus";
import { useDeleteTable } from "@/features/tables/hooks/useDeleteTable";
import { useRegenerateTableQr } from "@/features/tables/hooks/useRegenerateTableQr";
import { useOrders } from "@/features/orders";
import {
  TableQrModal,
  TakeawayQrModal,
} from "@/features/tables/components/TableQrDialogs";
import {
  MergeTableDialog,
  TransferTableDialog,
} from "@/features/tables/components/TableOperationsDialogs";
import type { RestaurantTable } from "@/features/tables/types";
import { TablesFilters } from "@/features/tables/components/TablesFilters";
import { TablesContent } from "@/features/tables/components/TablesContent";
import { TablesFormDialogs } from "@/features/tables/components/TablesFormDialogs";
import { TablesDataWarnings } from "@/features/tables/components/TablesDataWarnings";
import { TablesPageHeader } from "@/features/tables/components/TablesPageHeader";
import {
  TABLE_FORM_FIELDS,
  toTablePayload,
  useTableFormController,
} from "@/features/tables/hooks/useTableFormController";

export const TablesPage = () => {
  const { has } = usePermissions();
  const { branchId } = useAuthStore();
  const isAggregate = branchId === "all";

  const {
    showAdd,
    editing,
    qrTable,
    takeawayQrOpen,
    takeawayQr,
    takeawayQrBusy,
    transferSource,
    mergeSource,
    tableSearch,
    statusFilter,
    sectionFilter,
    setShowAdd,
    setEditing,
    setQrTable,
    setTakeawayQrOpen,
    setTakeawayQr,
    setTakeawayQrBusy,
    setTransferSource,
    setMergeSource,
    setTableSearch,
    setStatusFilter,
    setSectionFilter,
    clearFilters,
  } = useTablesPageState();

  const { form, apiErrors, prepareAdd, prepareEdit, resetForm } =
    useTableFormController();
  const { setError } = form;
  const { formErrorMessages, handleApiError } = apiErrors;

  const branchesQuery = useBranches({ enabled: isAggregate });
  const tablesQuery = useTables();
  const openOrdersQuery = useOrders({ status: "OPEN", limit: 100 });
  const branches = branchesQuery.data;
  const tables = tablesQuery.data;
  const openOrders = openOrdersQuery.data ?? [];
  useTablesRealtimeSync();

  const addMutation = useCreateTable();
  const updateMutation = useUpdateTable();
  const statusMutation = useUpdateTableStatus();
  const deleteMutation = useDeleteTable();
  const regenerateQrMutation = useRegenerateTableQr();
  const statusCounts = useMemo(
    () =>
      (tables ?? []).reduce<Record<string, number>>((counts, table) => {
        counts[table.status] = (counts[table.status] ?? 0) + 1;
        return counts;
      }, {}),
    [tables],
  );
  const sections = useMemo(
    () =>
      [...new Set((tables ?? []).map((table) => table.section).filter(Boolean))]
        .sort()
        .map((section) => ({ value: section!, label: section! })),
    [tables],
  );
  const filteredTables = useMemo(() => {
    const search = tableSearch.trim().toLowerCase();
    return (tables ?? []).filter(
      (table) =>
        (!search ||
          `${table.name} ${table.section ?? ""} ${table.branch?.name ?? ""}`
            .toLowerCase()
            .includes(search)) &&
        (!statusFilter || table.status === statusFilter) &&
        (!sectionFilter || table.section === sectionFilter),
    );
  }, [sectionFilter, statusFilter, tableSearch, tables]);
  const hasTableFilters = Boolean(tableSearch || statusFilter || sectionFilter);

  async function openTakeawayQr() {
    if (!branchId || branchId === "all") return;
    try {
      setTakeawayQrBusy(true);
      setTakeawayQr(await tablesApi.getTakeawayQr(branchId));
      setTakeawayQrOpen(true);
    } catch (error) {
      notifyError(error, "Unable to load takeaway QR");
    } finally {
      setTakeawayQrBusy(false);
    }
  }

  async function regenerateTakeawayQr() {
    if (!branchId || branchId === "all") return;
    try {
      setTakeawayQrBusy(true);
      setTakeawayQr(await tablesApi.regenerateTakeawayQr(branchId));
    } catch (error) {
      notifyError(error, "Unable to regenerate takeaway QR");
    } finally {
      setTakeawayQrBusy(false);
    }
  }

  const openAdd = () => {
    prepareAdd();
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    resetForm();
  };

  const openEdit = (table: RestaurantTable) => {
    prepareEdit(table);
    setEditing(table);
  };

  const closeEdit = () => {
    setEditing(null);
    resetForm();
  };
  const addDependencyBlocked =
    isAggregate && (branchesQuery.isLoading || branchesQuery.isError);

  return (
    <Page>
      <TablesPageHeader
        visibleCount={filteredTables.length}
        totalCount={tables?.length ?? 0}
        aggregate={isAggregate}
        takeawayQrBusy={takeawayQrBusy}
        canCreate={has("tables:create")}
        onOpenTakeawayQr={() => void openTakeawayQr()}
        onAdd={openAdd}
      />

      <TablesDataWarnings
        tables={{
          isError: tablesQuery.isError,
          isFetching: tablesQuery.isFetching,
          hasData: tables !== undefined,
          onRetry: () => void tablesQuery.refetch(),
        }}
        openOrders={{
          isError: openOrdersQuery.isError,
          isFetching: openOrdersQuery.isFetching,
          onRetry: () => void openOrdersQuery.refetch(),
        }}
      />

      <TablesFilters
        tableSearch={tableSearch}
        statusFilter={statusFilter}
        sectionFilter={sectionFilter}
        totalCount={tables?.length ?? 0}
        statusCounts={statusCounts}
        sections={sections}
        onSearchChange={setTableSearch}
        onStatusChange={setStatusFilter}
        onSectionChange={setSectionFilter}
        onClearFilters={clearFilters}
      />

      <TablesContent
        tables={tables}
        filteredTables={filteredTables}
        loading={tablesQuery.isLoading}
        error={tablesQuery.error}
        fetching={tablesQuery.isFetching}
        aggregate={isAggregate}
        hasFilters={hasTableFilters}
        canCreate={has("tables:create")}
        canManageOrders={has("orders:update")}
        operationsReady={openOrdersQuery.isSuccess}
        onRetry={() => void tablesQuery.refetch()}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id, name) => {
          if (confirm(`Remove table "${name}"?`)) deleteMutation.mutate(id);
        }}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        onShowQr={setQrTable}
        onTransfer={setTransferSource}
        onMerge={setMergeSource}
      />

      <TablesFormDialogs
        addOpen={showAdd}
        editing={editing}
        branches={branches ?? []}
        aggregate={isAggregate}
        form={form}
        formErrorMessages={formErrorMessages}
        addPending={addMutation.isPending}
        updatePending={updateMutation.isPending}
        addDependencyBlocked={addDependencyBlocked}
        {...(isAggregate && branchesQuery.isError
          ? {
              dependencyError: extractApiError(
                branchesQuery.error,
                "Branches could not be loaded. Retry before adding a table.",
              ),
              onRetryDependency: () => void branchesQuery.refetch(),
            }
          : {})}
        onCloseAdd={closeAdd}
        onCloseEdit={closeEdit}
        onAdd={(values) => {
          if (isAggregate && !values.branchId) {
            setError("branchId", { message: "Select a branch" });
            return;
          }
          addMutation.mutate(toTablePayload(values), {
            onSuccess: closeAdd,
            onError: (error) =>
              handleApiError(
                error,
                setError,
                TABLE_FORM_FIELDS,
                "Unable to add table",
              ),
          });
        }}
        onUpdate={(values) => {
          if (!editing) return;
          const payload = toTablePayload(values);
          updateMutation.mutate(
            {
              id: editing.id,
              input: {
                name: payload.name,
                capacity: payload.capacity,
                ...(payload.section && { section: payload.section }),
              },
            },
            {
              onSuccess: closeEdit,
              onError: (error) =>
                handleApiError(
                  error,
                  setError,
                  TABLE_FORM_FIELDS,
                  "Unable to update table",
                ),
            },
          );
        }}
      />
      <TakeawayQrModal
        data={takeawayQr}
        open={takeawayQrOpen}
        onClose={() => setTakeawayQrOpen(false)}
        onRegenerate={() => void regenerateTakeawayQr()}
        busy={takeawayQrBusy}
      />

      <TableQrModal
        table={qrTable}
        open={!!qrTable}
        onClose={() => setQrTable(null)}
        onRegenerate={() => {
          if (!qrTable) return;
          regenerateQrMutation.mutate(qrTable.id, {
            onSuccess: (updated) => setQrTable(updated),
          });
        }}
        regenerating={regenerateQrMutation.isPending}
      />
      <TransferTableDialog
        source={transferSource}
        tables={tables ?? []}
        openOrders={openOrders}
        onClose={() => setTransferSource(null)}
      />
      <MergeTableDialog
        source={mergeSource}
        tables={tables ?? []}
        openOrders={openOrders}
        onClose={() => setMergeSource(null)}
      />
    </Page>
  );
};
