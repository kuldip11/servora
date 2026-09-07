import { usePermissions } from "@/shared/auth/permissions";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tableFormSchema } from "@pos/validation";
import { Plus, Table2, Building2, QrCode } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Grid,
  Page,
  PageHeader,
  SelectMenu,
  SearchInput,
  FilterBar,
} from "@pos/ui";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { createTablesApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const tablesApi = createTablesApi(apiClient);
import { useTables } from "@/features/tables/hooks/useTables";
import { useTablesRealtimeSync } from "@/features/tables/hooks/useTablesRealtimeSync";
import { useTablesPageState } from "@/features/tables/hooks/useTablesPageState";
import { useCreateTable } from "@/features/tables/hooks/useCreateTable";
import { useUpdateTable } from "@/features/tables/hooks/useUpdateTable";
import { useUpdateTableStatus } from "@/features/tables/hooks/useUpdateTableStatus";
import { useDeleteTable } from "@/features/tables/hooks/useDeleteTable";
import { useRegenerateTableQr } from "@/features/tables/hooks/useRegenerateTableQr";
import { useOrders } from "@/features/orders/hooks/useOrders";
import { TableFormModal } from "@/features/tables/components/TableFormModal";
import { TableGrid } from "@/features/tables/components/TableGrid";
import {
  TableQrModal,
  TakeawayQrModal,
} from "@/features/tables/components/TableQrDialogs";
import {
  MergeTableDialog,
  TransferTableDialog,
} from "@/features/tables/components/TableOperationsDialogs";
import type { TableFormValues } from "@/features/tables/table-form.types";
import type { RestaurantTable } from "@/features/tables/types";

import {
  EMPTY_TABLE_FORM,
  TABLE_STATUS_OPTIONS,
} from "@/features/tables/constants";

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

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: EMPTY_TABLE_FORM,
  });

  const { data: branches } = useBranches({ enabled: isAggregate });
  const { data: tables, isLoading } = useTables();
  const { data: openOrders = [] } = useOrders({ status: "OPEN", limit: 100 });
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
      console.error("Unable to load takeaway QR", error);
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
      console.error("Unable to regenerate takeaway QR", error);
    } finally {
      setTakeawayQrBusy(false);
    }
  }

  function openAdd() {
    reset(EMPTY_TABLE_FORM);
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
    reset(EMPTY_TABLE_FORM);
  }

  function openEdit(table: RestaurantTable) {
    setEditing(table);
    reset({
      name: table.name,
      capacity: String(table.capacity),
      section: table.section ?? "",
      branchId: "",
    });
  }

  function closeEdit() {
    setEditing(null);
    reset(EMPTY_TABLE_FORM);
  }

  function toPayload(values: TableFormValues) {
    return {
      name: values.name.trim(),
      capacity: Number(values.capacity),
      ...(values.section.trim() && { section: values.section.trim() }),
      ...(values.branchId && { branchId: values.branchId }),
    };
  }

  return (
    <Page>
      <PageHeader
        title="Tables"
        description={`${filteredTables.length} of ${tables?.length ?? 0} tables`}
        actions={
          <>
            {!isAggregate && (
              <Button
                variant="secondary"
                onClick={() => void openTakeawayQr()}
                disabled={takeawayQrBusy}
              >
                <QrCode className="w-4 h-4" />
                Takeaway QR
              </Button>
            )}
            {has("tables:create") && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Add Table
              </Button>
            )}
          </>
        }
      />

      <Card padding="sm">
        <FilterBar
          onClearAll={
            [tableSearch, statusFilter, sectionFilter].filter(Boolean).length >
            1
              ? clearFilters
              : undefined
          }
        >
          <SearchInput
            value={tableSearch}
            onChange={(event) => setTableSearch(event.target.value)}
            onClear={() => setTableSearch("")}
            placeholder="Search table or section"
            aria-label="Search tables"
            className="w-full sm:w-64"
          />
          <div className="flex max-w-full gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                !statusFilter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-text-secondary"
              }`}
            >
              All {tables?.length ?? 0}
            </button>
            {TABLE_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                  statusFilter === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-text-secondary"
                }`}
              >
                {option.label} {statusCounts[option.value] ?? 0}
              </button>
            ))}
          </div>
          {sections.length > 1 && (
            <SelectMenu
              aria-label="Filter tables by section"
              valuePrefix="Section"
              placeholder="All sections"
              value={sectionFilter || undefined}
              options={[{ value: "", label: "All sections" }, ...sections]}
              onChange={(value) => setSectionFilter(value ?? "")}
              className="w-44"
            />
          )}
        </FilterBar>
      </Card>

      {isLoading ? (
        <Grid columns={{ base: 2, sm: 3, lg: 4 }} gap="md">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="h-40 animate-pulse" />
          ))}
        </Grid>
      ) : !filteredTables.length ? (
        <EmptyState
          icon={Table2}
          title={hasTableFilters ? "No matching tables" : "No tables yet"}
          description={
            hasTableFilters
              ? "Try a different status, section, or search term."
              : "Add the tables in your restaurant so waiters can assign dine-in orders to them."
          }
          action={
            has("tables:create") && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Add Table
              </Button>
            )
          }
        />
      ) : isAggregate ? (
        Object.entries(
          filteredTables.reduce<Record<string, RestaurantTable[]>>(
            (acc, table) => {
              const key = table.branch?.name ?? "Unknown branch";
              (acc[key] ??= []).push(table);
              return acc;
            },
            {},
          ),
        ).map(([branchName, branchTables]) => (
          <div key={branchName} className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-text-disabled" />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                {branchName}
              </p>
            </div>
            <TableGrid
              tables={branchTables}
              onEdit={openEdit}
              onDelete={(id, name) => {
                if (confirm(`Remove table "${name}"?`))
                  deleteMutation.mutate(id);
              }}
              onStatusChange={(id, status) =>
                statusMutation.mutate({ id, status })
              }
              onShowQr={setQrTable}
              onTransfer={has("orders:update") ? setTransferSource : undefined}
              onMerge={has("orders:update") ? setMergeSource : undefined}
            />
          </div>
        ))
      ) : (
        <TableGrid
          tables={filteredTables}
          onEdit={openEdit}
          onDelete={(id, name) => {
            if (confirm(`Remove table "${name}"?`)) deleteMutation.mutate(id);
          }}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          onShowQr={setQrTable}
          onTransfer={has("orders:update") ? setTransferSource : undefined}
          onMerge={has("orders:update") ? setMergeSource : undefined}
        />
      )}

      <TableFormModal
        mode="add"
        open={showAdd}
        editing={null}
        branches={branches ?? []}
        aggregate={isAggregate}
        errors={errors}
        register={register}
        handleSubmit={handleSubmit}
        pending={addMutation.isPending}
        onClose={closeAdd}
        onSubmit={(values) => {
          if (isAggregate && !values.branchId) {
            setError("branchId", { message: "Select a branch" });
            return;
          }
          addMutation.mutate(toPayload(values), { onSuccess: closeAdd });
        }}
      />
      <TableFormModal
        mode="edit"
        open={!!editing}
        editing={editing}
        branches={branches ?? []}
        aggregate={false}
        errors={errors}
        register={register}
        handleSubmit={handleSubmit}
        pending={updateMutation.isPending}
        onClose={closeEdit}
        onSubmit={(values) => {
          if (!editing) return;
          const payload = toPayload(values);
          updateMutation.mutate(
            {
              id: editing.id,
              input: {
                name: payload.name,
                capacity: payload.capacity,
                ...(payload.section && { section: payload.section }),
              },
            },
            { onSuccess: closeEdit },
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
