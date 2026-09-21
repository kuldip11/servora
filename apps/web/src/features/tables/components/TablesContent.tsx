import { Building2, Plus, Table2 } from "lucide-react";
import { Button, Card, EmptyState, Grid, QueryErrorState } from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import { TableGrid } from "@/features/tables/components/TableGrid";
import type { RestaurantTable } from "@/features/tables/types";

type Props = {
  tables: RestaurantTable[] | undefined;
  filteredTables: RestaurantTable[];
  loading: boolean;
  error: unknown;
  fetching: boolean;
  aggregate: boolean;
  hasFilters: boolean;
  canCreate: boolean;
  canManageOrders: boolean;
  operationsReady: boolean;
  onRetry: () => void;
  onAdd: () => void;
  onEdit: (table: RestaurantTable) => void;
  onDelete: (id: string, name: string) => void;
  onStatusChange: (id: string, status: RestaurantTable["status"]) => void;
  onShowQr: (table: RestaurantTable) => void;
  onTransfer: (table: RestaurantTable) => void;
  onMerge: (table: RestaurantTable) => void;
};

export const TablesContent = ({
  tables,
  filteredTables,
  loading,
  error,
  fetching,
  aggregate,
  hasFilters,
  canCreate,
  canManageOrders,
  operationsReady,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
  onStatusChange,
  onShowQr,
  onTransfer,
  onMerge,
}: Props) => {
  if (loading) {
    return (
      <Grid columns={{ base: 2, sm: 3, lg: 4 }} gap="md">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index} className="h-40 animate-pulse" />
        ))}
      </Grid>
    );
  }

  if (error && tables === undefined) {
    return (
      <QueryErrorState
        title="Unable to load tables"
        description={extractApiError(
          error,
          "Tables could not be loaded. Retry before relying on table availability.",
        )}
        isRetrying={fetching}
        onRetry={onRetry}
      />
    );
  }

  if (!filteredTables.length) {
    return (
      <EmptyState
        icon={Table2}
        title={hasFilters ? "No matching tables" : "No tables yet"}
        description={
          hasFilters
            ? "Try a different status, section, or search term."
            : "Add the tables in your restaurant so waiters can assign dine-in orders to them."
        }
        action={
          canCreate ? (
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4" /> Add Table
            </Button>
          ) : undefined
        }
      />
    );
  }

  const commonGridProps = {
    onEdit,
    onDelete,
    onStatusChange,
    onShowQr,
    ...(canManageOrders && operationsReady ? { onTransfer, onMerge } : {}),
  };

  if (!aggregate) {
    return <TableGrid tables={filteredTables} {...commonGridProps} />;
  }

  const tablesByBranch = filteredTables.reduce<
    Record<string, RestaurantTable[]>
  >((accumulator, table) => {
    const branchName = table.branch?.name ?? "Unknown branch";
    (accumulator[branchName] ??= []).push(table);
    return accumulator;
  }, {});

  return (
    <>
      {Object.entries(tablesByBranch).map(([branchName, branchTables]) => (
        <div key={branchName} className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-text-disabled" />
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {branchName}
            </p>
          </div>
          <TableGrid tables={branchTables} {...commonGridProps} />
        </div>
      ))}
    </>
  );
};
